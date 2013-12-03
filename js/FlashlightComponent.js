define([
	'goo/entities/components/Component',
	'goo/entities/components/LightComponent',
	'goo/renderer/light/SpotLight',
	'js/Game'
], function(
	Component,
	LightComponent,
	SpotLight,
	Game
) {
	'use strict';
	function FlashlightComponent(){
		this.type = "FlashlightComponent";
		var spotLight = new SpotLight();
		spotLight.angle = 35;
		spotLight.range = 10;
		spotLight.penumbra = 25;
		spotLight.intensity = 1.0;

		var spotLightEntity = Game.world.createEntity('FlashLight');
		spotLightEntity.setComponent(new LightComponent(spotLight));
		spotLightEntity.addToWorld();

		Game.viewCam.transformComponent.attachChild( spotLightEntity.transformComponent);
	}
	FlashlightComponent.prototype = Object.create(Component.prototype);
	return FlashlightComponent;
});