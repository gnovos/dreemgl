/* Copyright 2015-2016 Teeming Society. Licensed under the Apache License, Version 2.0 (the "License"); DreemGL is a collaboration between Teeming Society & Samsung Electronics, sponsored by Samsung and others. 
   You may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0 
   Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
   either express or implied. See the License for the specific language governing permissions and limitations under the License.*/

define.class(function(require, shape3d){

	var GLGeom = require('$system/geometry/basicgeometry')

	this.attributes = {
		radius: Config({type:float, value:0.5}),
		detail: vec2(40,40),
	}

	this.bg = {
		update:function(){
			var view = this.view
			this.mesh = this.vertexstruct.array();
			GLGeom.createSphere(view.radius, view.detail[0], view.detail[1],function(triidx,v1,v2,v3,n1,n2,n3,t1,t2,t3,faceidx){
				this.mesh.push(v1,n1,t1);
				this.mesh.push(v2,n2,t2);
				this.mesh.push(v3,n3,t3);
			}.bind(this))	
		}
	}
})
