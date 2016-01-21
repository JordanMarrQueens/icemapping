var mapSocket = io(window.location.origin + '/map');
var qsetMap = {
	popup : L.popup({offset:[10,10]}),
	markerIcon :  L.icon({iconUrl: '../images/marker-icon.png', shadowUrl: '../images/marker-shadow.png', iconAnchor: [12, 40], iconSize:[24, 40], popupAnchor:[0,-30]}),
	roverIcon :  L.icon({iconUrl: '../images/cursor.png', iconSize:[20, 20], className : 'rover-location-icon'}),
	markers : [],
	qMap : null,
	role : null,
	init : function (mapID, role) {
		this.qMap = L.map(mapID, {minZoom: 14}).setView([44.225797, -76.492674], 14);
        L.tileLayer('http://'+window.location.hostname+':3001/{z}/{x}/{y}.png').addTo(this.qMap);
		this.markers[0] = {id:0,marker:L.marker([44.222022, -76.497743], {icon: this.roverIcon}).addTo(this.qMap), heading:0};
		this.markers[0].marker.bindPopup('Location <br>Lat: '+this.markers[0].marker.getLatLng().lat+'<br>Lon: '+this.markers[0].marker.getLatLng().lng)
		//code to update the location/rotation of the rover
		
		this.qMap.on('zoomend', function(){
			//update rotation
			var id = '.rover-location-icon';
			//console.log($(id).css('transform'))
			var tx = parseInt($(id).css('transform').split(',')[4])
			var ty = parseInt($(id).css('transform').split(',')[5])
			//console.log('tx: '+tx+' ty: '+ty)
			var deg = qsetMap.markers[0].heading;
			var trString = 'translate3d('+tx+'px, '+ty+'px, 0px) rotate('+deg+'deg)';
			//console.log(trString)
			$(id).css('transform', trString); //update the rotation of the icon
		})

				
		mapSocket.on('locationUpdate', function(newLocation){
			var lat = newLocation.latitude;
			var lon = newLocation.longitude;
			var deg = newLocation.heading;
			
			qsetMap.markers[0].marker.setLatLng([lat, lon]); //update the location of the icon
			
			//update rotation
			var id = '.rover-location-icon';
			//console.log($(id).css('transform'))
			var tx = parseInt($(id).css('transform').split(',')[4])
			var ty = parseInt($(id).css('transform').split(',')[5])
			//console.log('tx: '+tx+' ty: '+ty)
			
			var trString = 'translate3d('+tx+'px, '+ty+'px, 0px) rotate('+deg+'deg)';
			console.log(trString)
			$(id).css('transform', trString); //update the rotation of the icon
			qsetMap.markers[0].heading = deg; //store the heading for later retrieval if needed
			
			//the drivers view is always centerd on the rover
			if(role==='drive'){
				qsetMap.qMap.setView([lat,lon]);
			};
			
		});
		
		
		//Initiate extra bits depending on the context of this map
		if(role === 'gps'){ //enable click on the GPS map
			this.qMap.on('click', this.onMapClick);
		}
		if(role === 'gps' || role === 'drive'){
			mapSocket.on('targets', function(targetList){
				for(var target of targetList){
					qsetMap.addMarker(target.label, [target.lat, target.lon], (target.data||null), target.id);
				}
			});
			
			mapSocket.on('target-added', function(target){
				qsetMap.addMarker(target.label, [target.lat, target.lon], (target.data||null), target.id);
			});
			mapSocket.on('target-deleted', qsetMap.removeMarker);
			
		}
		
		
		this.role = role;
		console.log('Map Initiated');
	},
	
	onMapClick : function (evt) {
		console.log('Map Clicked: '+evt.latlng.toString());
		var popup = this.mapPopup = L.popup();
		popup.setLatLng(evt.latlng);
		popup.setContent('<div style="float:left;">Lat: '+evt.latlng.lat + '</br>Lon: '+evt.latlng.lng+'</div><button style="" id="pin-this-location" class="btn waves">Pin</button>');
		popup.openOn(qsetMap.qMap);
		
		$('button#pin-this-location').on('click', function(e){
			$('input#latitude').focus().val(evt.latlng.lat)
			$('input#longitude').focus().val(evt.latlng.lng)
			$('input#label').focus()
		});
		
	},
	
	addMarker : function(label, latlong, data, id){
		var marker = {lable:label, data:data, id:id}
		marker.marker = L.marker(latlong, {icon: this.markerIcon}).bindPopup(label).openPopup().addTo(this.qMap);
		this.markers.push(marker);
	},
	
	removeMarker : function(delID){
		var index = qsetMap.markers.findIndex(function(itm){
			if(itm.id === delID ) return true;
			return false;
		});
		
		if(~index){
			qsetMap.qMap.removeLayer(qsetMap.markers[index].marker)
			qsetMap.markers.splice(index,1)
		} else {console.log('Error Deleting (or already deleted) id: '+delID)}
	},
	
	roverLocation : function(){
		var latlng = this.markers[0].marker.getLatLng();
		latlng.head = this.markers[0].heading;
		return latlng
		
	}
};
