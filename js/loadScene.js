require([
	'goo/addons/howler/components/HowlerComponent',
	'goo/addons/howler/systems/HowlerSystem',
	'goo/loaders/DynamicLoader',
	'goo/math/Vector3',
	'goo/math/Quaternion',

	'goo/renderer/Camera',
	'goo/entities/components/CameraComponent',

	'goo/entities/components/ScriptComponent',
	'goo/scripts/OrbitCamControlScript',

	'goo/renderer/light/DirectionalLight',
	'goo/entities/components/LightComponent',
	'goo/util/rsvp',
	'js/Game',
	'js/Time',
	'js/Input',
	'js/FPSCamComponent',
	'js/OverShoulderCam',
	'js/CharacterController'

], function (
	HowlerComponent,
	HowlerSystem,
	DynamicLoader,
	Vector3,
	Quaternion,

	Camera,
	CameraComponent,

	ScriptComponent,
	OrbitCamControlScript,

	DirectionalLight,
	LightComponent,
	RSVP,
	Game,
	Time,
	Input,
	FPSCamComponent,
	OverShoulderCam,
	CharacterController
) {
	'use strict';
	// Ammo vars
	Game.levelMesh;
    
	Game.ammoWorld;
	var calcVec = new Vector3();
	// worker variables.
	var physTransform;
	var quaternion;
	var btVec;

	// enum PHY_ScalarType
	var PHY_FLOAT = 0;
	var PHY_DOUBLE = 1;
	var PHY_INTEGER = 2;
	var PHY_SHORT = 3;
	var PHY_FIXEDPOINT88 = 4;
	var PHY_UCHAR = 5;

	Vector3.DOWN = new Vector3(0,-1,0);
	Object.freeze(Vector3.DOWN);

	function initAmmoWorld() {

		physTransform = new Ammo.btTransform();
		Game.physTransform = physTransform;
		quaternion = new Quaternion();
		btVec = new Ammo.btVector3();

		var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
		var dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
		var overlappingPairCache = new Ammo.btDbvtBroadphase();
		var solver = new Ammo.btSequentialImpulseConstraintSolver();
		Game.ammoWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, overlappingPairCache, solver, collisionConfiguration );
		Game.ammoWorld.setGravity(new Ammo.btVector3(0, -20, 0));
		//Game.gravity = 12;

		//for(var i = 0, ilen = Game.levelMesh.transformComponent.children.length; i < ilen; i++){
		//	createAmmoMeshShape(Game.levelMesh.transformComponent.children[i].entity);
		//}
		createAmmoMeshShape(Game.levelMesh);

		// TODO:  Do this updating in a Worker()
		
		//setInterval(function(){ammoWorld.stepSimulation(1/60, 5)}, 1000/60);
	}

	function createAmmoMeshShape(entity){
		var groundShape = createTriangleMeshShape(entity);
		var groundTransform = new Ammo.btTransform();
		groundTransform.setIdentity();
		groundTransform.setOrigin(new Ammo.btVector3(0, 0, 0));
		var groundMass = 0; // Mass of 0 means ground won't move from gravity or collisions
		var localInertia = new Ammo.btVector3(0, 0, 0);
		var motionState = new Ammo.btDefaultMotionState( groundTransform );
		var rbInfo = new Ammo.btRigidBodyConstructionInfo(groundMass, motionState, groundShape, localInertia);
		var groundAmmo = new Ammo.btRigidBody( rbInfo );
		Game.ammoWorld.addRigidBody(groundAmmo);
	}

	function createTriangleMeshShape(entity) {
		
		var mesh = entity.getComponent("meshDataComponent");
		if(null == mesh){console.error("Entity requires a meshDataComponent.");return;}

		var meshData = mesh.meshData;
		var vertices = meshData.dataViews.POSITION;
		var indices = meshData.indexData.data;
		var numTriangles = meshData.indexCount / 3;
		var numVertices = meshData.vertexCount;

		var triangleMesh = new Ammo.btTriangleIndexVertexArray();

		var indexType = PHY_INTEGER;
		var mesh = new Ammo.btIndexedMesh();

		var floatByteSize = 4;
		var vertexBuffer = Ammo.allocate( floatByteSize * vertices.length, "float", Ammo.ALLOC_NORMAL );

		var scale = 1;

		for ( var i = 0, il = vertices.length; i < il; i ++ ) {

			Ammo.setValue( vertexBuffer + i * floatByteSize, scale * vertices[ i ], 'float' );

		}
		var use32bitIndices = true;
		var intByteSize = use32bitIndices ? 4 : 2;
		var intType = use32bitIndices ? "i32" : "i16";


		var indexBuffer = Ammo.allocate( intByteSize * indices.length, intType, Ammo.ALLOC_NORMAL );

		for ( var i = 0, il = indices.length; i < il; i ++ ) {

			Ammo.setValue( indexBuffer + i * intByteSize, indices[ i ], intType );

		}


		var indexStride = intByteSize * 3;
		var vertexStride = floatByteSize * 3;

		mesh.set_m_numTriangles( numTriangles );
		mesh.set_m_triangleIndexBase( indexBuffer );
		mesh.set_m_triangleIndexStride( indexStride );

		mesh.set_m_numVertices( numVertices );
		mesh.set_m_vertexBase( vertexBuffer );
		mesh.set_m_vertexStride( vertexStride );

		triangleMesh.addIndexedMesh( mesh, indexType );

		var useQuantizedAabbCompression = true;
		var buildBvh = true;

		var shape = new Ammo.btBvhTriangleMeshShape( triangleMesh, useQuantizedAabbCompression, buildBvh );

		return shape;
	}

	function createUserEntity(){
		Game.userEntity = Game.world.createEntity("UserEntity");
		Game.userEntity.addToWorld();
		Game.userEntity.transformComponent.attachChild(Game.userMesh.transformComponent);
		
		Game.userEntity.setComponent(new CharacterController(Game.userEntity));

		Game.userEntity.setComponent(new OverShoulderCam(Game.userEntity));
	}

	function init() {
		var promises = [];
		// Create typical goo application
		Game.world.setSystem(new Time(Game));
		Input.init(Game);
		Game.world.setSystem(new HowlerSystem());

		// The Loader takes care of loading data from a URL...
		var loader = new DynamicLoader({world: Game.world, rootPath: 'res'});

		promises.push(loader.loadFromBundle('project.project', 'root.bundle'));
		promises.push(loader.loadFromBundle('project.project', 'Marine.bundle'));

		RSVP.all(promises).then(function() {
			console.log(loader._configs);
			//var oldCam = loader.getCachedObjectForRef("entities/DefaultToolCamera.entity");
			//oldCam.removeFromWorld();
			
			Game.levelMesh = loader.getCachedObjectForRef("Level/entities/Box01_0.entity");
			Game.levelMesh.hitMask = 1;

			Game.userMesh = loader.getCachedObjectForRef("Space_MarineIdle/entities/RootNode.entity");

			initAmmoWorld();
			createUserEntity();
			// This function is called when the project has finished loading.
			Game.renderer.domElement.id = 'goo';
			document.body.appendChild(Game.renderer.domElement);
		})
		.then(null, function(e) {
			// The second parameter of 'then' is an error handling function.
			// We just pop up an error message in case the scene fails to load.
			alert('Failed to load scene: ' + e);
			console.log(e.stack);
		});
	}

	init();
});
