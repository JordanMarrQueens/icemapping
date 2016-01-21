var sensorSocket = io(window.location.origin + '/sensor');
var dataTable = document.getElementById("sensor-data");
function loadList() {
	var array = Cookies.getJSON("science_data");

	if (typeof array === "undefined") {
		array = [];
	}

	for (var i = 0; i < $("#saved-items li").length; i++) {
		qsetMap.removeMarker(i + 1);
	}

	$("#saved-items").empty();

	for (var i = 0; i < array.length; i++) {
		var obj = array[i];

		qsetMap.addMarker(obj.name + " (" + obj.time + "): " + obj.value, [obj.latitude, obj.longitude], (null), i + 1);

		$("#saved-items").append("<li class=\"collection-item avatar\"> \
                    <i class=\"material-icons circle red\">location_on</i> \
                    <span class=\"title\">" + obj.name + "</span> \
                    <p class=\"detail-text\">" + obj.latitude + "<br>" + obj.longitude + "<br>" + obj.time + "\
                    </p> \
                    <div class=\"secondary-content valign-wrapper\"> \
                        <div class=\"left valign\" style=\"padding-right:10px\"> \
                            <h5>" + obj.value + "</h5> \
                        </div> \
                        <div class=\"right valign\"> \
                            <button href=\"#!\" class=\"btn-floating\" onclick=\"deleteItem("+ i + ")\"> \
                                <i class=\"material-icons\">delete</i> \
                            </button> \
                        </div> \
                    </div> \
                </li>");
	}
	if (array.length == 0) {
		document.getElementById("map-list").style.display = "none";
	} else {
		document.getElementById("map-list").style.display = "block";
	}
}

function deleteItem(value) {
	var array = Cookies.getJSON("science_data");
	array.splice(value, 1);
	Cookies.set("science_data", array);
	loadList();
}

function addItem(value) {
	var row = dataTable.rows[value];
	var obj = {};
	obj.name = row.cells[0].innerHTML;
	obj.value = row.cells[1].innerHTML;
	obj.latitude = row.cells[2].innerHTML;
	obj.longitude = row.cells[3].innerHTML;
	obj.time = row.cells[4].innerHTML;
	var array = Cookies.getJSON("science_data");
	if (array == undefined) array = [];
	array.push(obj);
	Cookies.set("science_data", array);
	loadList();
}

function deleteAll() {
	Cookies.set("science_data", []);
	loadList();
}

function refreshItem(value) {
	document.getElementById("spinner-" + value).style.display = "";
	document.getElementById("refresh-" + value).style.display = "none";

	var sensor = "";
	switch (value) {
		case 1:
			sensor = "windSpeed";
			break;
		case 2:
			sensor = "windDirection";
			break;
	}

	sensorSocket.emit("requestSensorUpdate", sensor);
}

function refreshAll() {
	
	for (var i = 1; i < dataTable.rows.length; i++) {
		refreshItem(i);
	}
}

function exportAll() {
	var csvText = "";
	csvText += "Name,Value,Time,Latitude,Longitude\n";

	var array = Cookies.getJSON("science_data");
	for (var i = 0; i < array.length; i++) {
		var obj = array[i];
		csvText += obj.name + "," + obj.value + "," + obj.time + "," + obj.latitude + "," + obj.longitude + "\n";
	}

	var blob = new Blob([csvText], { type: "text/plain;charset=utf-8" });
	saveAs(blob, "scienceData.csv");
}