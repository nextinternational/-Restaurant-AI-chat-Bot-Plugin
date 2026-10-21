/**
 * Restaurant AI Chat - frontend client.
 *
 * Security model (matches the architecture doc):
 *  - The client sends ONLY the public widget key + a session token + the message text.
 *  - The client never sends or knows a restaurantId. The server resolves the tenant.
 *  - The server returns already-verified text and (when needed) the contact number.
 *  - All server text is rendered with textContent (never innerHTML) to prevent XSS.
 *
 * Backend contract:
 *  POST {apiBase}/v1/chat/{widgetKey}/sessions
 *       -> 201 { sessionToken: string, restaurantName: string }
 *  POST {apiBase}/v1/chat/{widgetKey}/messages
 *       headers: Authorization: Bearer <sessionToken>
 *       body:    { message: string }
 *       -> 200 { type: "answer" | "contact", message: string,
 *                reason?: string, contactPhone?: string }
 *  Errors: 401 = session invalid/expired (client creates a new one and retries once)
 *          429 = rate limited
 */
(function () {
	'use strict';

	var REQUEST_TIMEOUT_MS = 30000;
	var MAX_STORED_MESSAGES = 40;

	/* ------------------------------ helpers ------------------------------ */

	function h(tag, className, attrs) {
		var node = document.createElement(tag);
		if (className) { node.className = className; }
		if (attrs) {
			Object.keys(attrs).forEach(function (key) { node.setAttribute(key, attrs[key]); });
		}
		return node;
	}

	function icon(svg, extraClass, size) {
		var span = h('span', 'rac-icon' + (extraClass ? ' ' + extraClass : ''), { 'aria-hidden': 'true' });
		span.innerHTML = size ? svg.replace(/\{S\}/g, String(size)) : svg; // static, trusted markup only
		return span;
	}

	var ICONS = {
		chat: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
		food: '<svg viewBox="0 0 24 24" width="{S}" height="{S}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10"/><path d="M17 21V3c-2.5 1.5-4 4.5-4 8h4"/></svg>',
		arrow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
		close: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
		send: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
		refresh: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
		phone: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.2-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>'
	};

	/** Keep only characters valid in a phone number; used for the tel: link. */
	function cleanPhone(value) {
		return String(value || '').replace(/[^\d+\-() ]/g, '').trim().slice(0, 32);
	}

	function storageGet(key) {
		try { return JSON.parse(window.sessionStorage.getItem(key)); } catch (e) { return null; }
	}
	function storageSet(key, value) {
		try { window.sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
	}
	function storageRemove(key) {
		try { window.sessionStorage.removeItem(key); } catch (e) { /* storage unavailable */ }
	}

	/* ------------------------------ demo mode ---------------------------- */

	function mockReply(text) {
		var t = text.toLowerCase();
		var reply;
		if (/price|how much|cost/.test(t)) {
			reply = { type: 'answer', message: 'Our grilled salmon is $38. (demo answer)', contact: null };
		} else if (/open|close|hour|time/.test(t)) {
			reply = { type: 'answer', message: 'We close at 10 PM today. (demo answer)', contact: null };
		} else if (/where|locat|address/.test(t)) {
			reply = { type: 'answer', message: '123 Example Street, Your City. (demo answer)', contact: null };
		} else {
			reply = {
				type: 'contact',
				message: "I don't have verified information about this. Please contact the restaurant directly.",
				contact: { phone: '+1 555 010 0000' }
			};
		}
		return new Promise(function (resolve) { setTimeout(function () { resolve(reply); }, 700); });
	}

	/* ------------------------------ chat class --------------------------- */

	function Chat(root, cfg) {
		this.root = root;
		this.cfg = cfg;
		this.t = cfg.i18n || {};
		this.busy = false;
		this.isOpen = cfg.mode === 'inline';
		this.storeKey = 'rac:' + (cfg.widgetKey || 'demo');
		this.state = storageGet(this.storeKey) || { token: null, messages: [] };
		this.build();
		this.restore();
	}

	Chat.prototype.build = function () {
		var self = this;
		var cfg = this.cfg;
		var floating = cfg.mode === 'floating';

		this.root.classList.add('rac-mode-' + cfg.mode, 'rac-pos-' + cfg.position, 'rac-header-' + (cfg.headerStyle === 'solid' ? 'solid' : 'light'));
		this.root.textContent = '';

		if (floating) {
			this.launcher = h('button', 'rac-launcher', { type: 'button', 'aria-label': this.t.open, 'aria-expanded': 'false' });
			var iconBox = h('span', 'rac-launcher-icon');
			iconBox.appendChild(icon(ICONS.chat, 'rac-icon-chat'));
			iconBox.appendChild(icon(ICONS.close, 'rac-icon-x'));
			this.launcher.appendChild(iconBox);
			if (cfg.launcherLabel) {
				var lbl = h('span', 'rac-launcher-label');
				lbl.textContent = cfg.launcherLabel;
				this.launcher.appendChild(lbl);
			}
			this.launcher.addEventListener('click', function () { self.toggle(); });
			this.root.appendChild(this.launcher);
		}

		this.panel = h('section', 'rac-panel', { 'aria-label': cfg.botName || 'Chat' });
		if (floating) {
			this.panel.setAttribute('role', 'dialog');
			this.panel.hidden = true;
		}

		/* header */
		var header = h('header', 'rac-header');
		var avatar = h('div', 'rac-avatar');
		avatar.appendChild(icon(ICONS.food, '', 20));
		header.appendChild(avatar);
		var titleWrap = h('div', 'rac-title-wrap');
		var title = h('div', 'rac-title');
		title.textContent = cfg.botName || '';
		titleWrap.appendChild(title);
		var status = h('div', cfg.mock ? 'rac-status rac-demo' : 'rac-status');
		status.textContent = cfg.mock ? (this.t.demo || 'Demo mode') : (this.t.online || 'Online');
		titleWrap.appendChild(status);
		header.appendChild(titleWrap);

		var resetBtn = h('button', 'rac-icon-btn', { type: 'button', 'aria-label': this.t.newChat, title: this.t.newChat });
		resetBtn.appendChild(icon(ICONS.refresh));
		resetBtn.addEventListener('click', function () { self.reset(); });
		header.appendChild(resetBtn);

		if (floating) {
			var closeBtn = h('button', 'rac-icon-btn', { type: 'button', 'aria-label': this.t.close, title: this.t.close });
			closeBtn.appendChild(icon(ICONS.close));
			closeBtn.addEventListener('click', function () { self.close(); });
			header.appendChild(closeBtn);
		}
		this.panel.appendChild(header);

		/* message log */
		this.log = h('div', 'rac-log', { role: 'log', 'aria-live': 'polite', tabindex: '0' });
		this.panel.appendChild(this.log);

		/* suggestions */
		this.suggestBox = h('div', 'rac-suggestions');
		if ((cfg.suggestions || []).length) {
			var sl = h('div', 'rac-suggest-label');
			sl.textContent = this.t.quick || 'Quick questions';
			this.suggestBox.appendChild(sl);
		}
		(cfg.suggestions || []).forEach(function (q) {
			var chip = h('button', 'rac-chip', { type: 'button' });
			var chipText = h('span', 'rac-chip-text');
			chipText.textContent = q;
			chip.appendChild(chipText);
			chip.appendChild(icon(ICONS.arrow, 'rac-chip-arrow'));
			chip.addEventListener('click', function () { self.send(q); });
			self.suggestBox.appendChild(chip);
		});
		this.panel.appendChild(this.suggestBox);

		/* input form */
		this.form = h('form', 'rac-form', { autocomplete: 'off' });
		this.input = h('input', 'rac-input', {
			type: 'text',
			dir: 'auto',
			maxlength: String(cfg.maxLength || 500),
			placeholder: cfg.placeholder || '',
			'aria-label': cfg.placeholder || 'Message'
		});
		this.sendBtn = h('button', 'rac-send', { type: 'submit', 'aria-label': this.t.send });
		this.sendBtn.appendChild(icon(ICONS.send));
		this.form.appendChild(this.input);
		this.form.appendChild(this.sendBtn);
		this.form.addEventListener('submit', function (e) {
			e.preventDefault();
			var value = self.input.value;
			self.input.value = '';
			self.send(value);
		});
		this.panel.appendChild(this.form);

		if (cfg.disclaimer) {
			var foot = h('div', 'rac-footnote');
			foot.textContent = cfg.disclaimer;
			this.panel.appendChild(foot);
		}

		this.panel.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && floating && self.isOpen) { self.close(); }
		});

		this.root.appendChild(this.panel);
	};

	Chat.prototype.restore = function () {
		var self = this;
		if (this.cfg.welcome) {
			this.render('bot', this.cfg.welcome, null);
		}
		this.state.messages.forEach(function (m) { self.render(m.role, m.text, m.contact); });
		if (this.state.messages.length) { this.suggestBox.hidden = true; }
		this.scroll();
	};

	/* open / close */
	Chat.prototype.open = function () {
		this.isOpen = true;
		this.panel.hidden = false;
		this.launcher.setAttribute('aria-expanded', 'true');
		this.launcher.setAttribute('aria-label', this.t.close);
		this.scroll();
		this.input.focus();
	};
	Chat.prototype.close = function () {
		this.isOpen = false;
		this.panel.hidden = true;
		this.launcher.setAttribute('aria-expanded', 'false');
		this.launcher.setAttribute('aria-label', this.t.open);
		this.launcher.focus();
	};
	Chat.prototype.toggle = function () { this.isOpen ? this.close() : this.open(); };

	/* rendering */
	Chat.prototype.render = function (role, text, contact) {
		var row = h('div', 'rac-row rac-row-' + role);
		if (role === 'bot') {
			var mini = h('div', 'rac-mini');
			mini.appendChild(icon(ICONS.food, '', 15));
			row.appendChild(mini);
		}
		var bubble = h('div', 'rac-msg rac-msg-' + role, { dir: 'auto' });
		bubble.textContent = text; // never innerHTML

		var phone = contact && cleanPhone(contact.phone);
		if (phone) {
			var link = h('a', 'rac-call', { href: 'tel:' + phone.replace(/[^\d+]/g, '') });
			link.appendChild(icon(ICONS.phone));
			var label = h('span');
			label.textContent = (this.t.callNow || 'Call') + ' ' + phone;
			link.appendChild(label);
			bubble.appendChild(link);
		}
		row.appendChild(bubble);
		this.log.appendChild(row);
		return row;
	};

	Chat.prototype.addMessage = function (role, text, contact, persist) {
		this.render(role, text, contact);
		this.scroll();
		if (persist !== false) {
			this.state.messages.push({ role: role, text: text, contact: contact || null });
			if (this.state.messages.length > MAX_STORED_MESSAGES) {
				this.state.messages = this.state.messages.slice(-MAX_STORED_MESSAGES);
			}
			storageSet(this.storeKey, this.state);
		}
	};

	Chat.prototype.showTyping = function () {
		this.typing = h('div', 'rac-row rac-row-bot');
		var tmini = h('div', 'rac-mini');
		tmini.appendChild(icon(ICONS.food, '', 15));
		this.typing.appendChild(tmini);
		var bubble = h('div', 'rac-msg rac-msg-bot rac-typing', { role: 'status', 'aria-label': this.t.typing });
		bubble.appendChild(h('span'));
		bubble.appendChild(h('span'));
		bubble.appendChild(h('span'));
		this.typing.appendChild(bubble);
		this.log.appendChild(this.typing);
		this.scroll();
	};
	Chat.prototype.hideTyping = function () {
		if (this.typing && this.typing.parentNode) { this.typing.parentNode.removeChild(this.typing); }
		this.typing = null;
	};

	Chat.prototype.scroll = function () { this.log.scrollTop = this.log.scrollHeight; };

	Chat.prototype.setBusy = function (busy) {
		this.busy = busy;
		this.sendBtn.disabled = busy;
		this.root.classList.toggle('rac-busy', busy);
	};

	Chat.prototype.reset = function () {
		this.state = { token: null, messages: [] };
		storageRemove(this.storeKey);
		this.log.textContent = '';
		this.suggestBox.hidden = false;
		if (this.cfg.welcome) { this.render('bot', this.cfg.welcome, null); }
		this.input.focus();
	};

	/* ------------------------------ networking --------------------------- */

	Chat.prototype.configured = function () {
		return this.cfg.mock || (this.cfg.widgetKey && this.cfg.apiBase);
	};

	Chat.prototype.request = function (path, body, withSession) {
		var cfg = this.cfg;
		// Widget key travels in the URL path (backend contract). No custom headers other than
		// Authorization/Content-Type, because the backend's CORS preflight allows only those.
		var headers = { 'Content-Type': 'application/json' };
		if (withSession && this.state.token) { headers.Authorization = 'Bearer ' + this.state.token; }

		var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
		var timer = setTimeout(function () { if (controller) { controller.abort(); } }, REQUEST_TIMEOUT_MS);

		return fetch(cfg.apiBase + '/v1/chat/' + encodeURIComponent(cfg.widgetKey) + path, {
			method: 'POST',
			headers: headers,
			body: JSON.stringify(body || {}),
			credentials: 'omit',
			signal: controller ? controller.signal : undefined
		}).then(function (res) {
			clearTimeout(timer);
			if (!res.ok) {
				var err = new Error('HTTP ' + res.status);
				err.status = res.status;
				throw err;
			}
			return res.json();
		}, function (e) {
			clearTimeout(timer);
			throw e;
		});
	};

	Chat.prototype.ensureSession = function () {
		var self = this;
		if (this.state.token) { return Promise.resolve(); }
		return this.request('/sessions', {}, false).then(function (data) {
			if (!data || typeof data.sessionToken !== 'string') { throw new Error('Invalid session response'); }
			self.state.token = data.sessionToken;
			storageSet(self.storeKey, self.state);
		});
	};

	Chat.prototype.normalize = function (data) {
		if (!data || typeof data.message !== 'string' || !data.message) { throw new Error('Invalid message response'); }
		return {
			type: data.type === 'contact' ? 'contact' : 'answer',
			message: data.message,
			contact: data.contactPhone ? { phone: String(data.contactPhone) } : null
		};
	};

	Chat.prototype.ask = function (text) {
		var self = this;
		if (this.cfg.mock) { return mockReply(text); }

		function attempt() {
			return self.ensureSession().then(function () {
				return self.request('/messages', { message: text }, true);
			});
		}

		return attempt().catch(function (err) {
			if (err && err.status === 401) { // session expired: create a new one, retry once
				self.state.token = null;
				return attempt();
			}
			throw err;
		}).then(function (data) { return self.normalize(data); });
	};

	Chat.prototype.send = function (raw) {
		var self = this;
		var text = String(raw || '').trim().slice(0, this.cfg.maxLength || 500);
		if (!text || this.busy) { return; }

		if (!this.configured()) {
			if (window.console) { console.warn('[Restaurant AI Chat] Missing Widget Key or API Base URL.'); }
			this.addMessage('bot', this.t.notReady, null, false);
			return;
		}

		this.addMessage('user', text, null);
		this.suggestBox.hidden = true;
		this.setBusy(true);
		this.showTyping();

		this.ask(text).then(function (res) {
			self.hideTyping();
			self.addMessage('bot', res.message, res.contact);
		}).catch(function (err) {
			self.hideTyping();
			var msg = err && err.status === 429 ? self.t.rateLimited : (err && err.status === 403 ? self.t.originBlocked : self.t.error);
			self.addMessage('bot', msg, null, false); // errors are not persisted
		}).then(function () {
			self.setBusy(false);
			self.input.focus();
		});
	};

	/* ------------------------------ bootstrap ---------------------------- */

	function init(root) {
		if (root.getAttribute('data-rac-ready')) { return; }
		var cfg;
		try { cfg = JSON.parse(root.getAttribute('data-rac-config')); } catch (e) { return; }
		if (!cfg) { return; }
		root.setAttribute('data-rac-ready', '1');
		new Chat(root, cfg);
	}

	function initAll(scope) {
		var nodes = (scope || document).querySelectorAll('.rac-root:not([data-rac-ready])');
		Array.prototype.forEach.call(nodes, init);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function () { initAll(); });
	} else {
		initAll();
	}

	/* Elementor editor: re-initialise when the widget is re-rendered after a setting change. */
	window.addEventListener('elementor/frontend/init', function () {
		if (window.elementorFrontend && window.elementorFrontend.hooks) {
			window.elementorFrontend.hooks.addAction('frontend/element_ready/restaurant_ai_chat.default', function ($scope) {
				initAll($scope && $scope[0]);
			});
		}
	});
})();
