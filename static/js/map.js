var buildListItem = function(target){return '<li id="target-'+target.id+'" class="collection-item avatar"><i class="material-icons circle red">location_on</i> <span class="target-label">'+target.label+'</span> <p class="detail-text">'+target.lat+'<br>'+target.lon+' </p> <button onClick="deleteTargetMarker('+target.id+')" href="#!" class="secondary-content btn-floating"><i class="material-icons">delete</i></button></li>'
}
var mapSocket = io(window.location.origin + '/map');



$('ul#map-targets').empty(); //empty any elements already in the list immediatly on load.

//prep to deal with adding targets and add it to the sidebar
mapSocket.on('target-added', function (target) {
	$('ul#map-targets').append(buildListItem(target));
});

//the initial load in of stored targets
mapSocket.on('targets', function(targetList) {
	 //master list from rover, load targets onto map
	 console.log(targetList);
	 for(var target of targetList){
		 $('ul#map-targets').append(buildListItem(target));
	 }
});

mapSocket.on('thickness', function(received_thickness) {
	$('input#label').focus().val(received_thickness)
});

//Allow form submission by keybord return
$('input').on('keypress', function (e) {
	if (e.keyCode == 13) {
		$('button#add-pin-location').click();
	}
})

$(document).on('keypress', function (e) {
	if (e.keyCode == 37) {		
		lat = iceMap.markers[0].marker.getLatLng().lat;
		lng = iceMap.markers[0].marker.getLatLng().lng - 0.0001;
		iceMap.markers[0].marker.setLatLng([lat, lng]);
	}
	else if (e.keyCode == 38) {		
		lat = iceMap.markers[0].marker.getLatLng().lat + 0.0001;
		lng = iceMap.markers[0].marker.getLatLng().lng;
		iceMap.markers[0].marker.setLatLng([lat, lng]);
	}
	else if (e.keyCode == 39) {		
		lat = iceMap.markers[0].marker.getLatLng().lat;
		lng = iceMap.markers[0].marker.getLatLng().lng + 0.0001;
		iceMap.markers[0].marker.setLatLng([lat, lng]);
	}
	else if (e.keyCode == 40) {		
		lat = iceMap.markers[0].marker.getLatLng().lat - 0.0001;
		lng = iceMap.markers[0].marker.getLatLng().lng;
		iceMap.markers[0].marker.setLatLng([lat, lng]);
	}
})

//what we do on button click
$('button#add-pin-location').on('click', function (evt) {
	
	var target = {}
	target.label = $('input#label').val()
	target.lat = $('input#latitude').val()
	target.lon = $('input#longitude').val()
	target.createTime = Date();
	target.type = 'gps'

	iceMap.qMap.closePopup(); //closes ANY and ALL open popups on the map

	//Reset the form fields once we've added the data. (also have to use the focus hack here, because Materialize)
	$('input#label').val('').focus()
	$('input#latitude').val('').focus()
	$('input#longitude').val('').focus().blur()
				
	//emit the creation of a new Target
	console.log('new target to be emitted: '+target)
	mapSocket.emit('new-marker', target);
				

    //		addTargetToMap(target) //add the targt to the map
    //		appendNewTargetList(target); //add it to the list beside the map
    //		transmitNewTarget(target); //send the new target to the rover for persistance/propegation

});

$('button#grab-rover-location').on('click', function (evt) {
	$('input#latitude').focus().val(iceMap.markers[0].marker.getLatLng().lat)
	$('input#longitude').focus().val(iceMap.markers[0].marker.getLatLng().lng)
	$('input#label').focus()
});

$('button#log-data').on('click', function (evt) {
	mapSocket.emit('log-data');
	
});

$('button#acquire-thickness').on('click', function (evt) {
	mapSocket.emit('acquire-thickness');
	
});

function deleteTargetMarker(id) {
	$('li#target-' + id).remove();
	iceMap.removeMarker(id);
	mapSocket.emit('delete-marker', id);
}
