var container;

var camera, scene, renderer;
var armModelPanCurrent=0;
var cube, plane, armModel, armModel2;

var targetRotation = 0;
var targetRotationOnMouseDown = 0;

var targetRotationVertical = 0;
var targetRotationVerticalOnMouseDown = 0;

var mouseX = 0;
var mouseXOnMouseDown = 0;

var mouseY = 0;
var mouseYOnMouseDown = 0;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

function initCanvas() {
    init();
    animate();
}
    
function init() {

    container = document.getElementById("model");

    camera = new THREE.PerspectiveCamera( 70, container.offsetWidth / container.offsetHeight, 1, 1000 );
    camera.position.y = -20;
    camera.position.z = 300;

    scene = new THREE.Scene();


    var directionalLight = new THREE.DirectionalLight( 0xffffff, 01 );
    directionalLight.position.set( 2, 2, 1 );
    directionalLight.castShadow = true;
    scene.add( directionalLight );
    
    //cube = new THREE.Mesh( body, material);
    //cube.position.y = 150;
    //scene.add( cube );

    //cube = new THREE.Mesh( antenna, material);
    //drawAntena();
    //scene.add( cube );
    
    // Plane

    var geometry = new THREE.PlaneBufferGeometry( 120, 20 );
    geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) );

    var material = new THREE.MeshBasicMaterial( { color: 0x000000, overdraw: 0.5, opacity: 0 } );

    plane = new THREE.Mesh( geometry, material );
    scene.add( plane );

    renderer = new THREE.CanvasRenderer();
    renderer.setClearColor( 0xf0f0f0 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( container.offsetWidth, container.offsetHeight );
    container.appendChild( renderer.domElement );

    container.addEventListener( 'mousedown', onDocumentMouseDown, false );
    container.addEventListener( 'touchstart', onDocumentTouchStart, false );
    container.addEventListener( 'touchmove', onDocumentTouchMove, false );
    window.addEventListener( 'resize', onWindowResize, false );

}

function drawAll(rotation, tilt, elbow_bend) {
    // Cube				
    var armModelBox = new THREE.BoxGeometry( 120, 20, 20 );
    var bodyBox = new THREE.BoxGeometry( 220, 40, 70 );
    var wheelCyl = new THREE.CylinderGeometry(30, 30, 20, 64);
    
    var material =  new THREE.MeshPhongMaterial({
                        // intermediate
                        color: '#00abb1',
                        // dark
                        emissive: '#006063',
                        shininess: 100,
                        overdraw : 0.50
                    });
    if (armModel != null) {
        scene.remove(armModel);
        scene.remove(armModel2);
        scene.remove(body);
        scene.remove(wheel1);
        scene.remove(wheel2);
        scene.remove(wheel3);
        scene.remove(wheel4);
    }
    armModel = new THREE.Mesh( armModelBox, material);
    body = new THREE.Mesh( bodyBox, material);
    wheel = new THREE.Mesh( wheelCyl, material);
    
    var mat = new THREE.Matrix4();
    mat.makeTranslation(-100, -20, 0);
    body.applyMatrix(mat);
    scene.add(body);
    
    wheel1 = wheel.clone();
    mat.makeRotationX(Math.PI/2.0);
    wheel1.applyMatrix(mat);
    mat.makeTranslation(-180, -40, 50);
    wheel1.applyMatrix(mat);
    scene.add(wheel1);
    
    wheel2 = wheel.clone();
    mat.makeRotationX(Math.PI/2.0);
    wheel2.applyMatrix(mat);
    mat.makeTranslation(-180, -40, -50);
    wheel2.applyMatrix(mat);
    scene.add(wheel2);
    
    wheel3 = wheel.clone();
    mat.makeRotationX(Math.PI/2.0);
    wheel3.applyMatrix(mat);
    mat.makeTranslation(0, -40, 50);
    wheel3.applyMatrix(mat);
    scene.add(wheel3);
    
    wheel4 = wheel.clone();
    mat.makeRotationX(Math.PI/2.0);
    wheel4.applyMatrix(mat);
    mat.makeTranslation(0, -40, -50);
    wheel4.applyMatrix(mat);
    scene.add(wheel4);
    
    drawarmModel(rotation, tilt, elbow_bend);
}

function drawarmModel(rotation, tilt, elbow_bend) {
    var mat = new THREE.Matrix4();
    //NOTE: Length of armModel in model is 120. That is why
    //it is used in the calculations below
    
    rotation = rotation * Math.PI/180
    tilt = tilt * Math.PI/180
    elbow_bend = elbow_bend * Math.PI/180
    
    armModel2 = armModel.clone();
    
    mat.makeTranslation( 60, 0, 0 );
    armModel.applyMatrix(mat);
    mat.makeRotationZ(tilt);
    armModel.applyMatrix(mat);
    mat.makeRotationY(rotation);
    armModel.applyMatrix(mat);
    
    mat.makeTranslation( 60, 0, 0 )
    armModel2.applyMatrix(mat);
    mat.makeRotationZ(tilt+elbow_bend-Math.PI);
    armModel2.applyMatrix(mat);
    mat.makeTranslation( 120 * Math.cos(tilt), 120 * Math.sin(tilt), 0);
    armModel2.applyMatrix(mat);
    mat.makeRotationY(rotation);
    armModel2.applyMatrix(mat);
    
    scene.add(armModel);
    scene.add(armModel2);
    
}

function drawBox(box, dx, dy, dz, angle) {
    mat = new THREE.Matrix4();
    mat.makeRotationZ(angle);
    box.applyMatrix(mat);
    box.position.x += dx;
    box.position.y += dy;				
    box.position.z += dz;
    scene.add( box );				
}

function onWindowResize() {

    windowHalfX = container.offsetWidth / 2;
    windowHalfY = container.offsetHeight / 2;

    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( container.offsetWidth, container.offsetHeight );

}

//

function onDocumentMouseDown( event ) {

    event.preventDefault();

    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
    document.addEventListener( 'mouseup', onDocumentMouseUp, false );
    document.addEventListener( 'mouseout', onDocumentMouseOut, false );

    mouseXOnMouseDown = event.clientX - windowHalfX;
    mouseYOnMouseDown = event.clientY - windowHalfY;
    targetRotationOnMouseDown = targetRotation;
    targetRotationVerticalOnMouseDown = targetRotationVertical;

}

function onDocumentMouseMove( event ) {

    mouseX = event.clientX - windowHalfX;
    mouseY = event.clientY - windowHalfY;

    targetRotation = targetRotationOnMouseDown + ( mouseX - mouseXOnMouseDown ) * 0.02;
    targetRotationVertical = targetRotationVerticalOnMouseDown + ( mouseY - mouseYOnMouseDown) * 0.02;

}

function onDocumentMouseUp( event ) {

    document.removeEventListener( 'mousemove', onDocumentMouseMove, false );
    document.removeEventListener( 'mouseup', onDocumentMouseUp, false );
    document.removeEventListener( 'mouseout', onDocumentMouseOut, false );

}

function onDocumentMouseOut( event ) {

    document.removeEventListener( 'mousemove', onDocumentMouseMove, false );
    document.removeEventListener( 'mouseup', onDocumentMouseUp, false );
    document.removeEventListener( 'mouseout', onDocumentMouseOut, false );

}

function onDocumentTouchStart( event ) {

    if ( event.touches.length === 1 ) {

        event.preventDefault();

        mouseXOnMouseDown = event.touches[ 0 ].pageX - windowHalfX;
        mouseYOnMouseDown = event.touches[ 0 ].pageY - windowHalfY;
        targetRotationOnMouseDown = targetRotation;
        targetRotationVerticalOnMouseDown = targetRotationVertical;

    }

}

function onDocumentTouchMove( event ) {

    if ( event.touches.length === 1 ) {

        event.preventDefault();

        mouseX = event.touches[ 0 ].pageX - windowHalfX;
        mouseY = event.touches[ 0 ].pageY - windowHalfY;
        
        targetRotation = targetRotationOnMouseDown + ( mouseX - mouseXOnMouseDown ) * 0.05;
        targetRotationVertical = targetRotationVerticalOnMouseDown + ( mouseY - mouseYOnMouseDown ) * 0.05;

    }

}

//

function animate() {

    requestAnimationFrame( animate );

    render();
}

function render() {

    scene.rotation.y = scene.rotation.y + ( targetRotation - scene.rotation.y ) * 0.05;
    scene.rotation.x = scene.rotation.x + ( targetRotationVertical - scene.rotation.x ) * 0.05;
    renderer.render( scene, camera );

}