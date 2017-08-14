<?php
 /**
 * Template Name: Vagaro Page Template
 *
 * @author Eric Lee <eric.lee@vagaro.com>
 * @copyright 2014 Vagaro Inc.
 * @package Vagaro
 * @version 0.1
 *
 **/

get_header(); ?>
	<div id="primary" class="site-content" style="width: 100%;">
		<div id="content" role="main" style="width: 100%; margin: 0px;">
			<?php
				while (have_posts()) {
					the_post();
					the_content();
				}
			?>
		</div>
	</div>
<?php get_footer(); ?>