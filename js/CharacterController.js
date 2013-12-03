define([
	'goo/entities/components/Component',
	'js/Game',
	'js/Time',
	'goo/math/Vector3',
	'goo/math/Quaternion',
	'js/Input',
	'goo/math/Ray'

], function(
	Component,
	Game,
	Time,
	Vector3,
	Quaternion,
	Input,
	Ray
){
	"use strict";
	var quaternion = new Quaternion();
	function CharacterController(entity){
		this.type = "CharacterController";
		this.entity = entity;
		this.newPos = new Vector3();
		this.oldPos = new Vector3();

		this.ray = new Ray();

		this.fwdBase = new Vector3(0,0,1);
		this.leftBase = new Vector3(1,0,0);
		this.direction = new Vector3(0,0,1);
		this.left = new Vector3(1,0,0);
		this.movement = new Vector3(0,0,0);
		this.grounded = false;
		//this.camComponent = null;

		this.horizontalTic = 0.01;

		this.moveVector = new Ammo.btVector3();
		this.speed = 5;

		//this.entityRot = new Vector3();
		this.yaw = 0.0;

		var mass = 1.5;
		var startTransform = new Ammo.btTransform();
		startTransform.setIdentity();
		startTransform.getOrigin().setY(5);
		var localInertia = new Ammo.btVector3(0,0,0);
		var shape = new Ammo.btCapsuleShape(0.5, 0.8);
		shape.calculateLocalInertia(mass, localInertia);
		var motionState = new Ammo.btDefaultMotionState(startTransform);
		var rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, shape, localInertia );
		entity.ammoComponent = new Ammo.btRigidBody(rbInfo);
		// keep it always up
		entity.ammoComponent.setSleepingThresholds(0.0, 0.0);
		entity.ammoComponent.setAngularFactor(new Ammo.btVector3(0,0,0));
		entity.ammoComponent.setFriction(0.0);

		Game.ammoWorld.addRigidBody(entity.ammoComponent);
		this.ammoComponent = entity.ammoComponent;

		Game.register("FixedUpdate", this, this.fixedUpdate);
		Game.register("RenderUpdate", this, this.renderUpdate);
		Game.register("MouseMove", this, this.mouseMove);
	};
	CharacterController.prototype = Object.create(Component.prototype);
	//CharacterController.prototype.setCam = function(entity){
		//console.log(entity.overShoulderCam);
		//this.camComponent = entity.overShoulderCam;
	//}

	CharacterController.prototype.mouseMove = function(){
		if(Input.movement.x){
			if(this.movement.x != 0 || this.movement.z != 0){
			// mouse X - Camera Y axis

				this.entity.ammoComponent.getMotionState().getWorldTransform(Game.physTransform);
				var pquat = Game.physTransform.getRotation();
				
				this.yaw -= Input.movement.x * this.horizontalTic;
				if(this.yaw < 0){
					this.yaw += 2*Math.PI;
				}

				pquat.setEuler(this.yaw, 0, 0);
				Game.physTransform.setRotation(pquat);
				this.entity.ammoComponent.setWorldTransform(Game.physTransform);
			}
		}
	}
	CharacterController.prototype.fixedUpdate = function(){
		this.oldPos.copy(this.newPos);

		var self = this;
        this.grounded = false;
        
        this.entity.transformComponent.transform.applyForwardVector( this.fwdBase, this.direction); // get the direction the camera is looking
		this.entity.transformComponent.transform.applyForwardVector( this.leftBase, this.left); // get the direction to the left of the camera

			this.movement.copy(Vector3.ZERO);

			if (true == Input.keys[87]) // W
				this.movement.add(this.direction);
			if (true == Input.keys[83]) // S
				this.movement.sub(this.direction);
			if (true == Input.keys[65]) // A
				this.movement.add(this.left);
			if (true == Input.keys[68]) // D
				this.movement.sub(this.left);

			if(this.movement.x != 0 || this.movement.z != 0){
				if(this.entity.overShoulderCam.p0Rot.y != 0){
					this.entity.overShoulderCam.faceCamForward();
				}
				//this.entity.overShoulderCam.faceCamForward();
				this.movement.normalize(); // move the same amount regardless of where we look-
			}
			this.movement.y = this.ammoComponent.getLinearVelocity().y();

			this.ray.origin.copy(this.entity.transformComponent.transform.translation);
			this.ray.origin.y += 1.0;
			this.ray.direction = Vector3.DOWN;
			Game.castRay(this.ray, function(hit){
				if(null != hit){
					if(hit.distance <= 1.01){
						console.log(hit.distance);
						self.grounded = true;
					}
				}
			}, 1);

			if (true == Input.keys[32] && true == this.grounded) { // space bar
				// (2 * gravity * height)*mass
				this.movement.y = Math.sqrt(2*20*1.0)*1.5;
				//this.ammoComponent.applyCentralImpulse(new Ammo.btVector3(0,this.movement.y, 0));

			}
		
			this.moveVector.setValue(
      		this.movement.x * this.speed,
      		this.movement.y,
      		this.movement.z * this.speed);

		this.ammoComponent.setLinearVelocity(this.moveVector);
    };
    

    CharacterController.prototype.renderUpdate = function(){
    	//this.entity.transformComponent.setTranslation(
    	//	(this.newPos.x * Time.alpha) + (this.oldPos.x * (1 - Time.alpha)),
    	//	(this.newPos.y * Time.alpha) + (this.oldPos.y * (1 - Time.alpha)),
    	//	(this.newPos.z * Time.alpha) + (this.oldPos.z * (1 - Time.alpha))
    	//);

		this.entity.ammoComponent.getMotionState().getWorldTransform(Game.physTransform);
		var origin = Game.physTransform.getOrigin();
		this.entity.transformComponent.setTranslation(origin.x(), origin.y()-0.9, origin.z());
		var pquat = Game.physTransform.getRotation();
		quaternion.setd(pquat.x(), pquat.y(), pquat.z(), pquat.w());
		this.entity.transformComponent.transform.rotation.copyQuaternion(quaternion);

    	this.entity.transformComponent.setUpdated();

    	//console.log(this.newPos.x+","+this.newPos.y+","+this.newPos.z);
    };

	return CharacterController;
});