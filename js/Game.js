define([
	"js/NodeList",
	'goo/entities/GooRunner',
	'goo/math/Ray',
	'goo/entities/systems/PickingSystem',
	'goo/picking/PrimitivePickLogic',
	'goo/math/Vector3'
], function(
	NodeList,
	GooRunner,
	Ray,
	PickingSystem,
	PrimitivePickLogic,
	Vector3
){
	"use strict";
	var Game = new GooRunner({
		antialias: true,
		manuallyStartGameLoop: false,
		tpfSmoothingCount:1
	});

	Game.renderer.domElement.id = 'Game';
	document.body.appendChild(Game.renderer.domElement);

	var picking = new PickingSystem({pickLogic: new PrimitivePickLogic()});
    var v1 = new Vector3();
    var v2 = new Vector3();
    var cross = new Vector3();
    Game.world.setSystem(picking);
    Game.castRay = function(ray, callback, mask){
    	picking.pickRay = ray;
    	picking.onPick = function(result){
    		var hit = null;
    		if(null != result){
    			if(result.length > 0){
	    			var distance = Infinity;
	    			for(var i = 0, ilen = result.length; i < ilen; i++){
	    				if(null != result[i].entity.hitMask){
	    					if((result[i].entity.hitMask & mask) != 0){
	    						for(var j = 0, jlen = result[i].intersection.distances.length; j < jlen; j++){
	    							if(result[i].intersection.distances[j] < distance){
	    							
										v1.x = result[i].intersection.vertices[j][0].x - result[i].intersection.vertices[j][1].x;
										v1.y = result[i].intersection.vertices[j][0].y - result[i].intersection.vertices[j][1].y;
										v1.z = result[i].intersection.vertices[j][0].z - result[i].intersection.vertices[j][1].z;
					
										v2.x = result[i].intersection.vertices[j][2].x - result[i].intersection.vertices[j][0].x;
										v2.y = result[i].intersection.vertices[j][2].y - result[i].intersection.vertices[j][0].y;
										v2.z = result[i].intersection.vertices[j][2].z - result[i].intersection.vertices[j][0].z;

										cross.x = (v1.y * v2.z) - (v1.z * v2.y);
										cross.y = (v1.z * v2.x) - (v1.x * v2.z);
										cross.z = (v1.x * v2.y) - (v1.y * v2.x);
										cross.normalize();

										//if(dp <=0){
											
	        							distance = result[i].intersection.distances[j];
	        							hit = hit || {entity:null,point:null,vertex:null,distance:null};
	        							hit.entity = result[i].entity;
	        							hit.point =result[i].intersection.points[j];
	        							hit.normal = cross;
	        							hit.distance = result[i].intersection.distances[j];
	        							//}
	        						}
	    						}
	    					}
	    				}
	    			}
    			}
    		}
    		callback(hit);
    	};
    	picking._process();
    }


	var listeners = {};

	Game.register = function(e, o, c, priority){
		if(null == listeners[e]){
			listeners[e] = new NodeList();
		}
		else{
			for(var n = listeners[e].first; n; n = n.next){
				if(n.object === o){
					console.log("Callback already exists for this object!");
					return;
				}
			}
		}
		var node = {
			next:null,
			previous:null,
			callback:c,
			object:o
		};
		if(null == priority){
			listeners[e].addFirst(node);
		}
		else{
			node.priority = priority;
			listeners[e].addSorted(node);
		}
		return Game;
	};
	Object.freeze(Game.register);

	Game.unregister = function(e, o){
		if(null == listeners[e]){
			return;
		}
		var n = listeners[e].first;
		for(var n = listeners[e].first; n; n = n.next){
			if(n.object === o){
				listeners[e].remove(n);
			}
		}
		return Game;
	};
	Object.freeze(Game.unregister);

	Game.raiseEvent = function(){
		var e = [].shift.apply(arguments);
		if(null == e){return;}
		if(null == listeners[e]){
			return;
		}
		var n = listeners[e].first;
		for(var n = listeners[e].first; n; n = n.next){
			n.callback.apply(n.object, arguments);
		}
		return Game;
	}
	Object.freeze(Game.raiseEvent);
	return Game;
});