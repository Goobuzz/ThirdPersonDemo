require([
	'js/Game',
	'goo/loaders/DynamicLoader',
	'goo/math/Vector3',
	'goo/util/rsvp',
	'js/Time',
	'js/Input',
	'goo/addons/howler/systems/HowlerSystem',
	'goo/addons/howler/components/HowlerComponent',

], function (
	Game,
	DynamicLoader,
	Vector3,
	RSVP,
	Time,
	Input,
	HowlerSystem,
	HowlerComponent,

	Camera,
	CameraComponent,
	ScriptComponent,
	OrbitCamControlScript,
	DirectionalLight,
	LightComponent
) {
	'use strict';
	Game.world.setSystem(new Time(Game));
	Input.init(Game);
	Game.world.setSystem(new HowlerSystem());

	function init() {
		// The Loader takes care of loading data from a URL...
		var loader = new DynamicLoader({world: Game.world, rootPath: 'res'});
		loader.promise = [];

		loader.promise.push(loader.loadFromBundle('project.project', 'root.bundle'));

		RSVP.all(loader.promise).then(function() {
			console.log(loader._configs);
		})
		.then(null, function(e) {
			alert('Failed to load scene, check console for info.');
			console.log(e.stack);
		});
	}
	init();
});
