<?php
/**
 * Plugin Name:       Restaurant AI Chat for Elementor
 * Description:       Elementor widget that connects a restaurant website to the central AI Customer Service backend (Node.js/Express).
 * Version:           1.3.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Text Domain:       restaurant-ai-chat
 *
 * @package RestaurantAIChat
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'RAC_VERSION', '1.3.0' );
define( 'RAC_FILE', __FILE__ );
define( 'RAC_DIR', plugin_dir_path( __FILE__ ) );
define( 'RAC_URL', plugin_dir_url( __FILE__ ) );

require_once RAC_DIR . 'includes/class-plugin.php';

RAC_Plugin::instance();
