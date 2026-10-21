<?php
/**
 * Plugin loader.
 *
 * @package RestaurantAIChat
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class RAC_Plugin {

	/** @var RAC_Plugin|null */
	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_action( 'plugins_loaded', array( $this, 'boot' ) );
	}

	public function boot() {
		if ( ! did_action( 'elementor/loaded' ) ) {
			add_action( 'admin_notices', array( $this, 'notice_missing_elementor' ) );
			return;
		}

		add_action( 'elementor/frontend/after_register_styles', array( $this, 'register_styles' ) );
		add_action( 'elementor/frontend/after_register_scripts', array( $this, 'register_scripts' ) );
		add_action( 'elementor/widgets/register', array( $this, 'register_widgets' ) );
	}

	public function register_styles() {
		wp_register_style(
			'rac-chat',
			RAC_URL . 'assets/css/chat.css',
			array(),
			RAC_VERSION
		);
	}

	public function register_scripts() {
		wp_register_script(
			'rac-chat',
			RAC_URL . 'assets/js/chat.js',
			array(),
			RAC_VERSION,
			true
		);
	}

	/**
	 * @param \Elementor\Widgets_Manager $widgets_manager Elementor widgets manager.
	 */
	public function register_widgets( $widgets_manager ) {
		require_once RAC_DIR . 'includes/widgets/class-chat-widget.php';
		$widgets_manager->register( new \RAC\Widgets\Chat_Widget() );
	}

	public function notice_missing_elementor() {
		if ( ! current_user_can( 'activate_plugins' ) ) {
			return;
		}
		echo '<div class="notice notice-warning"><p>';
		echo esc_html__( 'Restaurant AI Chat requires Elementor to be installed and active.', 'restaurant-ai-chat' );
		echo '</p></div>';
	}
}
