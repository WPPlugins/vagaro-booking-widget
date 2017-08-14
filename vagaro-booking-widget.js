(function($) {
	if ('undefined' === typeof $Vagaro) {
		$Vagaro = {};
	}

	var s = $Vagaro;
	s.init = function () {
		$('#vagaro_command').val('');
		$('#vagaro_businessName').val('');
		$('#vagaro_servicesTab').val('');
		$('#vagaro_bookTab').val('');
		$('#vagaro_GCTab').val('');
		$('#vagaro_reviewsTab').val('');
		$('#vagaro_type').val('');
		$('#vagaro_height').val('');
		$('#vagaro_imageURL').val('');
		$('#vagaro_tag').val('');
		$('#vagaro_code').val('');
	};
	
	s.addWidget = function (businessName, servicesTab, bookTab, GCTab, reviewsTab, type, height, imageURL, code) {
		$('#vagaro_command').val('Add');
		$('#vagaro_businessName').val(businessName);
		$('#vagaro_servicesTab').val(servicesTab);
		$('#vagaro_bookTab').val(bookTab);
		$('#vagaro_GCTab').val(GCTab);
		$('#vagaro_reviewsTab').val(reviewsTab);
		$('#vagaro_type').val(type);
		$('#vagaro_height').val(height);
		$('#vagaro_imageURL').val(imageURL);
		$('#vagaro_code').val(code);
		document.forms['vagaro_form'].submit();
	};
	
	s.removeWidget = function (id) {
		$('#vagaro_command').val('Remove');
		$('#vagaro_id').val(id);
		document.forms['vagaro_form'].submit();
	};
		
	$(window).bind('message', function (e) {
		var data = JSON.parse(e.originalEvent.data);
		switch (data.msg) {
			case 'Widget':
				var w = data.args;
				s.addWidget(w.BusinessName, w.ServicesTab, w.BookTab, w.GCTab, w.ReviewsTab, w.Type, w.Height, w.ImageURL, w.Code);
				break;
			default:
				break;
		}
	});
	
	$(document).ready($Vagaro.init);
} (jQuery));