/* DreemGL is a collaboration between Teeming Society & Samsung Electronics, sponsored by Samsung and others.
   Copyright 2015-2016 Teeming Society. Licensed under the Apache License, Version 2.0 (the "License"); You may not use this file except in compliance with the License.
   You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0 Unless required by applicable law or agreed to in writing,
   software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and limitations under the License.*/

// Randomly display squares in a parent view. Move each view when the parent
// view is clicked.

define.class(function($server$, require, composition, $ui$, screen, view, blurview, icon, label){
	this.render = function(){
		return [
		screen({name:'default', clearcolor:'#484230'},
			blurview({flex: 1},
							 icon({icon: 'chain', fontsize: 100}),

							 view({
								 width:256,
								 height:256,
								 borderwidth:1,
								 bordercolor:"white",
								 bgimagemode:"stretch",
								 bgimage:require('$resources/textures/landscape.jpg')
							 })
							)
					 
					)
		]
	}
})
