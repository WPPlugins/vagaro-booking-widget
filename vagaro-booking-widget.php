<?php
/*
Plugin Name: Vagaro - Book 24/7
Plugin URI: https://www.vagaro.com/Salon-Software
Description: Online booking with Salon and Spa has never been easier. Use our cloud based system to accept appointments online from your WordPress website even when used on mobile phones. We also offer your clients a native mobile app to book with you on the go. Sell gift certificates and take reviews on your site. Run you whole Salon and Spa business using our point of sale capabilities. 
Version: 0.3
Author: Vagaro
Author URI: https://www.vagaro.com/Salon-Software
License: GPLv2
*/
/*  Copyright 2014 Vegaro Inc.  (email : support@vagaro.com)

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License, version 2, as 
    published by the Free Software Foundation.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
	
    You should have received a copy of the GNU General Public License
    along with this program; if not, write to the Free Software
    Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/

$vagaro_version = '0.3';

// Creates the DB schema when the plugin is installed.
function vagaro_install() {
	global $wpdb;
	global $vagaro_version;
	
	$installed_version = get_option('vagaro_version');

	if ($installed_version != $vagaro_version) {
		$table = $wpdb->prefix . 'vagaro';
		$sql = "CREATE TABLE $table (
			id bigint NOT NULL AUTO_INCREMENT,
			businessName varchar(100) DEFAULT '' NOT NULL,
			servicesTab tinyint DEFAULT 0 NOT NULL,
			bookTab tinyint DEFAULT 0 NOT NULL,
			GCTab tinyint DEFAULT 0 NOT NULL,
			reviewsTab tinyint DEFAULT 0 NOT NULL,
			type tinyint DEFAULT 0 NOT NULL,
			height int DEFAULT 0 NOT NULL,
			imageURL varchar(500) DEFAULT '' NOT NULL,
			code varchar(5000) DEFAULT '' NOT NULL,
			UNIQUE KEY id (id)
		)";
		require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
		dbDelta($sql);
		update_option('vagaro_version', $vagaro_version);
	}
}
register_activation_hook(__FILE__, 'vagaro_install');

// Validates the DB schema in case the plugin is upgraded.
function vagaro_check_upgrade() {
	global $vagaro_version;
    if (get_option('vagaro_version') != $vagaro_version) {
        vagaro_install();
    }
}
add_action('plugins_loaded', 'vagaro_check_upgrade');

// Drops the DB schema when the plugin is uninstalled.
function vagaro_uninstall() {
	global $wpdb;
    $table = $wpdb->prefix . 'vagaro';
	$wpdb->query("DROP TABLE IF EXISTS $table");
	update_option('vagaro_version', '0');
}
register_deactivation_hook(__FILE__, 'vagaro_uninstall');

// Fetches widgets.
function vagaro_fetch_widgets($select, $where) {
	global $wpdb;
	$table = $wpdb->prefix . 'vagaro';
	if (empty($select)) {
		$select = '*';
	}
	if (empty($where)) {
		$where = '1 = 1';
	}
	return $wpdb->get_row("SELECT $select FROM $table WHERE $where");
}

function vagaro_delete_page($id) {
	$pageID = get_option('vagaro_page_id');
	if ($pageID == $id) {
		delete_option('vagaro_page_id');
	}
}

// Loads vagaro-booking-widget.js after jQuery.
function vagaro_init_admin() {
	wp_enqueue_script('jquery');
	wp_register_script('interframe', plugins_url('interframe.js', __FILE__), array( 'jquery'));
	wp_enqueue_script('interframe');
	wp_register_script('vagaro_script', plugins_url('vagaro-booking-widget.js', __FILE__), array( 'jquery'));
	wp_enqueue_script('vagaro_script');

	if (isset($_POST['vagaro_command'])) {
		global $wpdb;
		$table = $wpdb->prefix . 'vagaro';
		$command = $_POST['vagaro_command'];
		$id = $_POST['vagaro_id'];
		
		// Current version limits only one record in DB.
		if ($command === 'Add') {
			$command = 'Update';
			$id = 1;
		}

		while (false == empty($command)) {
			switch ($command) {
				case 'Add':
					$wpdb->insert(
						$table,
						array(
							'businessName' => $_POST['vagaro_businessName'],
							'servicesTab' => (int) $_POST['vagaro_servicesTab'],
							'bookTab' => (int) $_POST['vagaro_bookTab'],
							'GCTab' => (int) $_POST['vagaro_GCTab'],
							'reviewsTab' => (int) $_POST['vagaro_reviewsTab'],
							'type' => (int) $_POST['vagaro_type'],
							'height' => (int) $_POST['vagaro_height'],
							'imageURL' => $_POST['vagaro_imageURL'],
							'code' => $_POST['vagaro_code']),
						array('%s',	'%d', '%d', '%d', '%d', '%d', '%d', '%s', '%s')
						);
					$command = null;
					break;
				case 'Update':
					$result = $wpdb->update(
						$table,
						array(
							'businessName' => $_POST['vagaro_businessName'],
							'servicesTab' => (int) $_POST['vagaro_servicesTab'],
							'bookTab' => (int) $_POST['vagaro_bookTab'],
							'GCTab' => (int) $_POST['vagaro_GCTab'],
							'reviewsTab' => (int) $_POST['vagaro_reviewsTab'],
							'type' => (int) $_POST['vagaro_type'],
							'height' => (int) $_POST['vagaro_height'],
							'imageURL' => $_POST['vagaro_imageURL'],
							'code' => $_POST['vagaro_code']),
						array('id' => $id),
						array('%s', '%d', '%d', '%d', '%d', '%d', '%d', '%s', '%s'),
						array('%d'));
					$command = (false == $result) ? 'Add' : null;
					break;
				case 'Remove':
					$wpdb->delete($table, array('id' => $id));
					$command = null;
					break;
				default:
					$command = null;
					break;
			}
		}
		
		// Creates the Book 24/7 page.
		$pageID = get_option('vagaro_page_id');	
		$page = null;
		if (false === empty($pageID) && (0 < $pageID)) { 
			$page = get_post($pageID);
		}
		if (null !== $page) {
			wp_update_post(array('ID' => $pageID, 'post_status' => 'publish'));
		} else {
			$pageID = wp_insert_post(array(
				'post_title' => 'Book 24/7',
				'post_content' => '[vagaro_booking_widget]',
				'post_status' => 'publish',
				'post_author' => 1,
				'post_type' => 'page'
			));
			update_option('vagaro_page_id', $pageID);
		}
		
		// Shows the Book 24/7 page.
		header("Location: /book-247");
		die();
	}

	if (current_user_can('delete_posts')) {
		add_action('delete_post', 'vagaro_delete_page');
	}
}
add_action('admin_init', 'vagaro_init_admin' );

function vagaro_add_admin_menu() {
	add_options_page('Vagaro Plugin Setup', 'Vagaro Setup', 'manage_options', 'vagaro_admin_page', 'vagaro_do_admin_page');
}
add_action('admin_menu', 'vagaro_add_admin_menu');

function vagaro_do_admin_page() {
	if (false === current_user_can('manage_options') )  {
		wp_die( __('You do not have sufficient permissions to access this page.'));
	}
?>
	<div class="wrap">
		<form id="vagaro_form" method="post">
			<div>
				<iframe id="vagaro_iframe" src='https://www.vagaro.com/WordPress?enc=jtNanql9ANA7oNkiTHmhZssDfhakhkpgGNf3C623eOw=' frameBorder="0" scrolling="no" width="960" style="padding: 0; border: 0; margin: 0 auto;"></iframe>
			</div>
			<input id="vagaro_command" type="hidden" name="vagaro_command" value="" />
			<input id="vagaro_id" type="hidden" name="vagaro_id" value="" />
			<input id="vagaro_businessName" type="hidden" name="vagaro_businessName" value="" />
			<input id="vagaro_servicesTab" type="hidden" name="vagaro_servicesTab" value="" />
			<input id="vagaro_bookTab" type="hidden" name="vagaro_bookTab" value="" />
			<input id="vagaro_GCTab" type="hidden" name="vagaro_GCTab" value="" />
			<input id="vagaro_reviewsTab" type="hidden" name="vagaro_reviewsTab" value="" />
			<input id="vagaro_type" type="hidden" name="vagaro_type" value="" />
			<input id="vagaro_height" type="hidden" name="vagaro_height" value="" />
			<input id="vagaro_imageURL" type="hidden" name="vagaro_imageURL" value="" />
			<input id="vagaro_tag" type="hidden" name="vagaro_tag" value="" />
			<input id="vagaro_code" type="hidden" name="vagaro_code" value="" />
		</form>
	</div>
<?php	
}

function vagaro_do_short_code($atts) {
		extract(shortcode_atts(array('id' => 1) , $atts));
		// Current version limits only one record in DB.
		$id = 1;
		$r = vagaro_fetch_widgets('code', "id = $id");
		return isset($r) ? stripslashes($r->code) : '';
}
add_shortcode('vagaro_booking_widget', 'vagaro_do_short_code');

function vagaro_redirect_page_template() {
	$pageID = get_option('vagaro_page_id');	
	if (false === empty($pageID) && (0 < $pageID)) { 
		if (is_page($pageID)) {
			include(dirname( __FILE__ ) . '/vagaro-page-template.php');
			exit();
		}
	}
}
add_action('template_redirect', 'vagaro_redirect_page_template', 1);
?>