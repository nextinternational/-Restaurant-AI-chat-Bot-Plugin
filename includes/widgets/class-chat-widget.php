<?php
/**
 * Elementor widget: AI Chat Assistant.
 *
 * The widget only holds PUBLIC configuration (widget key, API URL, texts, colors).
 * It never contains restaurantId, secrets, or API keys. The backend decides the tenant.
 *
 * @package RestaurantAIChat
 */

namespace RAC\Widgets;

use Elementor\Controls_Manager;
use Elementor\Group_Control_Typography;
use Elementor\Repeater;
use Elementor\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Chat_Widget extends Widget_Base {

	public function get_name() {
		return 'restaurant_ai_chat';
	}

	public function get_title() {
		return esc_html__( 'AI Chat Assistant', 'restaurant-ai-chat' );
	}

	public function get_icon() {
		return 'eicon-comments';
	}

	public function get_categories() {
		return array( 'general' );
	}

	public function get_keywords() {
		return array( 'chat', 'bot', 'ai', 'assistant', 'restaurant', 'support' );
	}

	public function get_script_depends() {
		return array( 'rac-chat' );
	}

	public function get_style_depends() {
		return array( 'rac-chat' );
	}

	protected function register_controls() {

		/* ---------------------------------------------------------------
		 * CONTENT: Connection
		 * ------------------------------------------------------------- */
		$this->start_controls_section(
			'section_connection',
			array(
				'label' => esc_html__( 'Connection', 'restaurant-ai-chat' ),
				'tab'   => Controls_Manager::TAB_CONTENT,
			)
		);

		$this->add_control(
			'widget_key',
			array(
				'label'       => esc_html__( 'Widget Key', 'restaurant-ai-chat' ),
				'type'        => Controls_Manager::TEXT,
				'placeholder' => 'wk_live_xxxxxxxxxxxx',
				'description' => esc_html__( 'Public identifier for this restaurant. It is NOT a secret and NOT authentication; the server decides the tenant.', 'restaurant-ai-chat' ),
				'dynamic'     => array( 'active' => false ),
			)
		);

		$this->add_control(
			'api_base_url',
			array(
				'label'       => esc_html__( 'API Base URL', 'restaurant-ai-chat' ),
				'type'        => Controls_Manager::TEXT,
				'placeholder' => 'https://api.yourdomain.com',
				'description' => esc_html__( 'Root URL of the Node.js/Express backend, without a trailing slash.', 'restaurant-ai-chat' ),
				'dynamic'     => array( 'active' => false ),
			)
		);

		$this->add_control(
			'mock_mode',
			array(
				'label'        => esc_html__( 'Demo mode (no backend)', 'restaurant-ai-chat' ),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__( 'On', 'restaurant-ai-chat' ),
				'label_off'    => esc_html__( 'Off', 'restaurant-ai-chat' ),
				'return_value' => 'yes',
				'default'      => 'yes',
				'description'  => esc_html__( 'Uses fake answers so you can test the design. Turn OFF when the backend is ready.', 'restaurant-ai-chat' ),
			)
		);

		$this->end_controls_section();

		/* ---------------------------------------------------------------
		 * CONTENT: Texts
		 * ------------------------------------------------------------- */
		$this->start_controls_section(
			'section_texts',
			array(
				'label' => esc_html__( 'Texts', 'restaurant-ai-chat' ),
				'tab'   => Controls_Manager::TAB_CONTENT,
			)
		);

		$this->add_control(
			'bot_name',
			array(
				'label'   => esc_html__( 'Assistant Name', 'restaurant-ai-chat' ),
				'type'    => Controls_Manager::TEXT,
				'default' => esc_html__( 'Restaurant Assistant', 'restaurant-ai-chat' ),
			)
		);

		$this->add_control(
			'welcome_message',
			array(
				'label'   => esc_html__( 'Welcome Message', 'restaurant-ai-chat' ),
				'type'    => Controls_Manager::TEXTAREA,
				'rows'    => 3,
				'default' => esc_html__( 'Hello! Ask me about our menu, opening hours or location.', 'restaurant-ai-chat' ),
			)
		);

		$this->add_control(
			'placeholder',
			array(
				'label'   => esc_html__( 'Input Placeholder', 'restaurant-ai-chat' ),
				'type'    => Controls_Manager::TEXT,
				'default' => esc_html__( 'Type your question...', 'restaurant-ai-chat' ),
			)
		);

		$this->add_control(
			'disclaimer',
			array(
				'label'   => esc_html__( 'Footer Note', 'restaurant-ai-chat' ),
				'type'    => Controls_Manager::TEXT,
				'default' => esc_html__( 'AI assistant. For urgent matters please call us.', 'restaurant-ai-chat' ),
			)
		);

		$suggestions = new Repeater();
		$suggestions->add_control(
			'text',
			array(
				'label'   => esc_html__( 'Question', 'restaurant-ai-chat' ),
				'type'    => Controls_Manager::TEXT,
				'default' => '',
			)
		);

		$this->add_control(
			'suggestions',
			array(
				'label'       => esc_html__( 'Suggested Questions', 'restaurant-ai-chat' ),
				'type'        => Controls_Manager::REPEATER,
				'fields'      => $suggestions->get_controls(),
				'default'     => array(
					array( 'text' => esc_html__( 'What are your opening hours?', 'restaurant-ai-chat' ) ),
					array( 'text' => esc_html__( 'Do you have vegetarian options?', 'restaurant-ai-chat' ) ),
					array( 'text' => esc_html__( 'Where are you located?', 'restaurant-ai-chat' ) ),
				),
				'title_field' => '{{{ text }}}',
			)
		);

		$this->end_controls_section();

		/* ---------------------------------------------------------------
		 * CONTENT: Layout
		 * ------------------------------------------------------------- */
		$this->start_controls_section(
			'section_layout',
			array(
				'label' => esc_html__( 'Layout', 'restaurant-ai-chat' ),
				'tab'   => Controls_Manager::TAB_CONTENT,
			)
		);

		$this->add_control(
			'display_mode',
			array(
				'label'   => esc_html__( 'Display Mode', 'restaurant-ai-chat' ),
				'type'    => Controls_Manager::SELECT,
				'default' => 'floating',
				'options' => array(
					'floating' => esc_html__( 'Floating bubble (site-wide)', 'restaurant-ai-chat' ),
					'inline'   => esc_html__( 'Inline (inside the page)', 'restaurant-ai-chat' ),
				),
			)
		);

		$this->add_control(
			'position',
			array(
				'label'     => esc_html__( 'Bubble Position', 'restaurant-ai-chat' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'right',
				'options'   => array(
					'right' => esc_html__( 'Right', 'restaurant-ai-chat' ),
					'left'  => esc_html__( 'Left', 'restaurant-ai-chat' ),
				),
				'condition' => array( 'display_mode' => 'floating' ),
			)
		);

		$this->add_control(
			'launcher_label',
			array(
				'label'       => esc_html__( 'Bubble Label', 'restaurant-ai-chat' ),
				'type'        => Controls_Manager::TEXT,
				'default'     => esc_html__( 'Ask us anything', 'restaurant-ai-chat' ),
				'description' => esc_html__( 'Text next to the chat icon. Leave empty for an icon-only round button.', 'restaurant-ai-chat' ),
				'condition'   => array( 'display_mode' => 'floating' ),
			)
		);

		$this->end_controls_section();

		/* ---------------------------------------------------------------
		 * STYLE
		 * ------------------------------------------------------------- */
		$this->start_controls_section(
			'section_style',
			array(
				'label' => esc_html__( 'Appearance', 'restaurant-ai-chat' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			)
		);

		$this->add_control(
			'header_style',
			array(
				'label'   => esc_html__( 'Header Style', 'restaurant-ai-chat' ),
				'type'    => Controls_Manager::SELECT,
				'default' => 'light',
				'options' => array(
					'light' => esc_html__( 'Light (soft)', 'restaurant-ai-chat' ),
					'solid' => esc_html__( 'Solid accent color', 'restaurant-ai-chat' ),
				),
			)
		);

		$this->add_control(
			'primary_color',
			array(
				'label'     => esc_html__( 'Accent Color', 'restaurant-ai-chat' ),
				'type'      => Controls_Manager::COLOR,
				'default'   => '#d9622b',
				'selectors' => array( '{{WRAPPER}} .rac-root' => '--rac-primary: {{VALUE}};' ),
			)
		);

		$this->add_control(
			'primary_text_color',
			array(
				'label'     => esc_html__( 'Text on Primary', 'restaurant-ai-chat' ),
				'type'      => Controls_Manager::COLOR,
				'default'   => '#ffffff',
				'selectors' => array( '{{WRAPPER}} .rac-root' => '--rac-on-primary: {{VALUE}};' ),
			)
		);

		$this->add_control(
			'window_bg',
			array(
				'label'     => esc_html__( 'Window Background', 'restaurant-ai-chat' ),
				'type'      => Controls_Manager::COLOR,
				'default'   => '#fffdf9',
				'selectors' => array( '{{WRAPPER}} .rac-root' => '--rac-bg: {{VALUE}};' ),
			)
		);

		$this->add_control(
			'bot_bubble_bg',
			array(
				'label'     => esc_html__( 'Assistant Bubble', 'restaurant-ai-chat' ),
				'type'      => Controls_Manager::COLOR,
				'default'   => '#ffffff',
				'selectors' => array( '{{WRAPPER}} .rac-root' => '--rac-bot-bg: {{VALUE}};' ),
			)
		);

		$this->add_control(
			'text_color',
			array(
				'label'     => esc_html__( 'Text Color', 'restaurant-ai-chat' ),
				'type'      => Controls_Manager::COLOR,
				'default'   => '#2b2118',
				'selectors' => array( '{{WRAPPER}} .rac-root' => '--rac-text: {{VALUE}};' ),
			)
		);

		$this->add_responsive_control(
			'window_width',
			array(
				'label'      => esc_html__( 'Window Width', 'restaurant-ai-chat' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px' ),
				'range'      => array( 'px' => array( 'min' => 280, 'max' => 520 ) ),
				'default'    => array( 'size' => 390, 'unit' => 'px' ),
				'selectors'  => array( '{{WRAPPER}} .rac-root' => '--rac-width: {{SIZE}}{{UNIT}};' ),
			)
		);

		$this->add_responsive_control(
			'window_height',
			array(
				'label'      => esc_html__( 'Window Height', 'restaurant-ai-chat' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px' ),
				'range'      => array( 'px' => array( 'min' => 360, 'max' => 800 ) ),
				'default'    => array( 'size' => 620, 'unit' => 'px' ),
				'selectors'  => array( '{{WRAPPER}} .rac-root' => '--rac-height: {{SIZE}}{{UNIT}};' ),
			)
		);

		$this->add_control(
			'radius',
			array(
				'label'      => esc_html__( 'Corner Radius', 'restaurant-ai-chat' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px' ),
				'range'      => array( 'px' => array( 'min' => 0, 'max' => 40 ) ),
				'default'    => array( 'size' => 24, 'unit' => 'px' ),
				'selectors'  => array( '{{WRAPPER}} .rac-root' => '--rac-radius: {{SIZE}}{{UNIT}};' ),
			)
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			array(
				'name'     => 'message_typography',
				'label'    => esc_html__( 'Message Typography', 'restaurant-ai-chat' ),
				'selector' => '{{WRAPPER}} .rac-msg',
			)
		);

		$this->end_controls_section();
	}

	protected function render() {
		$s = $this->get_settings_for_display();

		$suggestions = array();
		if ( ! empty( $s['suggestions'] ) && is_array( $s['suggestions'] ) ) {
			foreach ( $s['suggestions'] as $item ) {
				$text = isset( $item['text'] ) ? sanitize_text_field( $item['text'] ) : '';
				if ( '' !== $text ) {
					$suggestions[] = $text;
				}
			}
		}

		$config = array(
			'widgetKey'   => sanitize_text_field( $s['widget_key'] ),
			'apiBase'     => untrailingslashit( esc_url_raw( $s['api_base_url'] ) ),
			'mock'        => 'yes' === $s['mock_mode'],
			'mode'        => 'inline' === $s['display_mode'] ? 'inline' : 'floating',
			'position'    => 'left' === $s['position'] ? 'left' : 'right',
			'headerStyle' => 'solid' === $s['header_style'] ? 'solid' : 'light',
			'launcherLabel' => isset( $s['launcher_label'] ) ? sanitize_text_field( $s['launcher_label'] ) : '',
			'botName'     => sanitize_text_field( $s['bot_name'] ),
			'welcome'     => sanitize_textarea_field( $s['welcome_message'] ),
			'placeholder' => sanitize_text_field( $s['placeholder'] ),
			'disclaimer'  => sanitize_text_field( $s['disclaimer'] ),
			'suggestions' => $suggestions,
			'maxLength'   => 1000,
			'i18n'        => array(
				'open'        => __( 'Open chat', 'restaurant-ai-chat' ),
				'close'       => __( 'Close chat', 'restaurant-ai-chat' ),
				'send'        => __( 'Send message', 'restaurant-ai-chat' ),
				'newChat'     => __( 'Start a new conversation', 'restaurant-ai-chat' ),
				'callNow'     => __( 'Call', 'restaurant-ai-chat' ),
				'quick'       => __( 'Quick questions', 'restaurant-ai-chat' ),
				'online'      => __( 'Online', 'restaurant-ai-chat' ),
				'demo'        => __( 'Demo mode - not connected', 'restaurant-ai-chat' ),
				'typing'      => __( 'Assistant is typing', 'restaurant-ai-chat' ),
				'error'       => __( 'Sorry, something went wrong. Please try again in a moment.', 'restaurant-ai-chat' ),
				'rateLimited' => __( 'You are sending messages too quickly. Please wait a moment.', 'restaurant-ai-chat' ),
				'originBlocked' => __( 'Chat is not available on this website.', 'restaurant-ai-chat' ),
				'notReady'    => __( 'The chat is not configured yet.', 'restaurant-ai-chat' ),
			),
		);

		echo '<div class="rac-root" data-rac-config="' . esc_attr( wp_json_encode( $config ) ) . '"></div>';
	}
}
