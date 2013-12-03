define([
	'goo/entities/components/Component',
	'goo/math/Vector3',
	'goo/util/GameUtils',
	'js/Input',
	'js/Game',
	'js/Time',
	'goo/math/Ray',
	'goo/renderer/Camera',
	'goo/entities/components/CameraComponent',
	'goo/entities/EntityUtils'
], function(
	Component,
	Vector3,
	GameUtils,
	Input,
	Game,
	Time,
	Ray,
	Camera,
	CameraComponent,
	EntityUtils
){
	"use strict";
	function OverShoulderCam(ent){
		this.type = "OverShoulderCam";
		this.entity = ent;
		this.ray = new Ray();
		this.verticalTic = 0.01;
		this.horizontalTic = 0.01;
		this.p1Rot = new Vector3();
		this.p0Rot = new Vector3();
		this.p1OldRot = new Vector3();
		this.p0OldRot = new Vector3();
		this.camPos = new Vector3(0,0,-4);
		this.camWantPos = new Vector3(0,0,-4);

		this.entityRot = new Vector3();

		this.pivot0 = Game.world.createEntity("Cam Pivot0");
		this.pivot0.addToWorld();
		this.pivot0.transformComponent.setTranslation(0,1.25,0);
		this.entity.transformComponent.attachChild(this.pivot0.transformComponent);
		this.entity.transformComponent.setUpdated();
		this.pivot1 = Game.world.createEntity("Cam Pivot1");
		this.pivot1.addToWorld();
		this.pivot1.transformComponent.setTranslation(-0.25, 0, 0);
		this.pivot1.transformComponent.setRotation(-15*(Math.PI/180),0,0);
		this.pivot0.transformComponent.attachChild(this.pivot1.transformComponent);
		this.pivot0.transformComponent.setUpdated();
		
		this.camEntity = Game.world.createEntity("View Cam");
		this.camEntity.addToWorld();
		this.camEntity.transformComponent.setRotation(0,Math.PI,0);
		this.camEntity.transformComponent.setTranslation(0,0,-4);
		
		this.pivot1.transformComponent.attachChild(this.camEntity.transformComponent);

		var cam = new Camera(45, 1, 0.1, 100);
		this.camEntity.setComponent(new CameraComponent(cam));
		ent.transformComponent.attachChild(this.pivot0.transformComponent);

		Game.viewCam = this.camEntity;

		Game.register("MouseButton1", this, mouseButton1);
		Game.register("MouseMove", this, mouseMove);
		Game.register("RenderUpdate", this, renderUpdate);
		Game.register("Update", this, update);
	}
	OverShoulderCam.prototype = Object.create(Component.prototype);

	function mouseButton1(){
		if(true == Input.mouseButton[1]){
			if(!document.pointerLockElement) {
				GameUtils.requestPointerLock();
				return;
			}
			this.faceCamForward();
		}
	}

	OverShoulderCam.prototype.faceCamForward = function(){
		this.pivot0.transformComponent.worldTransform.rotation.toAngles(this.entityRot);
		this.entity.transformComponent.transform.rotation.fromAngles(0, this.entityRot.y, 0);
		this.entity.transformComponent.setUpdated();

		this.entity.ammoComponent.getMotionState().getWorldTransform(Game.physTransform);
		var pquat = Game.physTransform.getRotation();
		pquat.setEuler(this.entityRot.y, 0, 0);
		this.entity.characterController.yaw = this.entityRot.y;
		Game.physTransform.setRotation(pquat);
		this.entity.ammoComponent.setWorldTransform(Game.physTransform);

		this.p0Rot.y = 0;
		this.pivot0.transformComponent.transform.rotation.fromAngles(this.p0Rot.x, this.p0Rot.y, this.p0Rot.z);
		this.pivot0.transformComponent.setUpdated();
	}

	function mouseMove(){
		if(!document.pointerLockElement){return;}
		// mouse Y - Camera X axis
		if(Input.movement.y){
			this.p1OldRot.copy(this.p1Rot);
			this.pivot1.transformComponent.transform.rotation.toAngles(this.p1Rot);
			this.p1Rot.x += Input.movement.y * this.verticalTic;
			this.p1Rot.x = Math.min(Math.max(this.p1Rot.x, -Math.PI*0.5), Math.PI*0.5);
		}
		// mouse X - Camera Y axis

		if(Input.movement.x){
			if(this.entity.characterController.movement.x == 0 && this.entity.characterController.movement.z == 0){
				this.p0OldRot.copy(this.p0Rot);
				this.pivot0.transformComponent.transform.rotation.toAngles(this.p0Rot);
				this.p0Rot.y -= Input.movement.x * this.horizontalTic;
				if(this.p0Rot.y < 0){
					this.p0Rot.y += 2*Math.PI;
				}
			}
			else{
				this.p0Rot.y = 0;
				this.pivot0.transformComponent.transform.rotation.fromAngles(this.p0Rot.x, this.p0Rot.y, this.p0Rot.z);
				this.pivot0.transformComponent.setUpdated();
			}
		}
	}

// ray, callback, mask
	function update(){
		var self = this;
		this.ray.origin.copy(this.pivot1.transformComponent.worldTransform.translation);
		Vector3.sub(this.camEntity.transformComponent.worldTransform.translation, this.ray.origin, this.ray.direction);
		this.ray.direction.normalize();
		this.camEntity.transformComponent.transform.translation.z = this.camWantPos.z;
		Game.castRay(this.ray, function(hit){
			if(null != hit){
				//console.log(hit.distance);
				if(hit.distance < -self.camWantPos.z){
					self.camEntity.transformComponent.transform.translation.z = -hit.distance;
				}
			}
		}, 1);
		this.camEntity.transformComponent.setUpdated();
	}

	function renderUpdate(){
		
		this.pivot1.transformComponent.transform.rotation.fromAngles(this.p1Rot.x, this.p1Rot.y, this.p1Rot.z);
		this.pivot1.transformComponent.setUpdated();

		this.pivot0.transformComponent.transform.rotation.fromAngles(this.p0Rot.x, this.p0Rot.y, this.p0Rot.z);
		this.pivot0.transformComponent.setUpdated();
	}

	return OverShoulderCam;
});