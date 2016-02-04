/* Copyright 2015-2016 Teeming Society. Licensed under the Apache License, Version 2.0 (the "License"); DreemGL is a collaboration between Teeming Society & Samsung Electronics, sponsored by Samsung and others.
   You may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
   Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
   either express or implied. See the License for the specific language governing permissions and limitations under the License.*/


define.class(function(require, $ui$, view, checkbox,foldcontainer,  label, button, scrollbar,textbox, numberbox,$widgets$, colorpicker, radiogroup){
// internal

	this.attributes = {
		target:Config({type:Object}),
		property:Config({type:Object}),
		value:Config({type:Object}),
		propertyname:Config({type:String,value:""}),
		fontsize: Config({type:float, value: 13}),
		callback:Config({type:Function, value:function(val) {
			if (this.target && this.propertyname) {
				console.log('Set "', this.propertyname, '" to "', val, '" on: ', this.target);
				this.target[this.propertyname] = val;
			}
		}})
	};

	this.hardrect = {
		color:function(){
			var col1 = vec3("#3b3b3b");
			var col2=vec3("#3b3b3b");
			return vec4(mix(col1, col2, 1.0-pow(abs(uv.y),4.0) ),1.0)
		}
	}

	this.margin = 0
	this.padding = 0
	this.border = 0
	this.flexdirection = "row"
	this.flex = 1
	this.bordercolor = "gray"
	this.fgcolor = "#c0c0c0"

	this.style = {
		radiogroup:{
			margin:vec4(2,0,2,5)
		},
		foldconainer_color:{
			 width:302, title:"colorpicker",  bordercolor:"#383838", icon:"circle", collapsed:true
		},
		view_colorview:{
			bgcolor:NaN,width:300, flexdirection:"column"
		},
		numberbox_vec4:{
			flex:1,decimals:3, stepvalue:0.01, margin:2
		},
		numberbox_vec3:{
			flex:1, decimals:3, stepvalue:0.01, margin:2
		},
		numberbox_vec2:{
			 flex:1, decimals:3, stepvalue:0.01
		},
		numberbox_floatlike:{
			decimals:3, stepvalue:0.01, margin:2, flex:1
		}
	};

	this.render = function(){

		var typename = this.property.type ? this.property.type.name : "";
		var meta = this.property.meta ? this.property.meta : "";

		var editor;

		if (typename =="Enum"){

			editor = radiogroup({
				values:this.property.type.values,
				currentvalue:this.value,
				oncurrentvalue:function(ev,val) {this.callback(val)}.bind(this)
			});

		} else if (typename =="vec4"){

			if (this.property.meta=="color"){

				editor = foldcontainer({
					class:'color',
					basecolor:vec4(this.value[0],this.value[1],this.value[2],1.0)
				}, view({class:'color_view'},
					colorpicker({value:this.value,onvalue:function(ev,val,o){
						console.log('>s>', ev, val, o)
					}})));

			} else {
				var t1 = "";
				var t2 = "";
				var t3 = "";
				var t4 = "";
				if (this.property.meta =="tlbr")
				{
					t1 = "top"
					t2 = "left";
					t3 = "bottom";
					t4 = "right"
				}else
				if (this.property.meta =="ltrb")
				{
					t1 = "left";
					t2 = "top"
					t3 = "right"
					t4 = "bottom";
				}
				editor = view({bgcolor:NaN},
						numberbox({title:t1, class:'vec4', value:this.value[0]}),
						numberbox({title:t2, class:'vec4', value:this.value[1]}),
						numberbox({title:t3, class:'vec4', value:this.value[2]}),
						numberbox({title:t4, class:'vec4', value:this.value[3]}));
			}
		} else if (typename =="vec3"){

			var t1 = "";
			var t2 = "";
			var t3 = "";
			if (this.property.meta =="xyz"){
				t1 = "X"
				t2 = "Y";
				t3 = "Z";
			}

			editor = view({bgcolor:NaN},
					   numberbox({title:t1, class:'vec3', value:this.value[0]}),
					   numberbox({title:t2, class:'vec3', value:this.value[1]}),
				       numberbox({title:t3, class:'vec3', value:this.value[2]}));

		} else if (typename =="vec2"){
			editor = view({bgcolor:NaN},
					   numberbox({class:'vec2', value:this.value[0],margin:2}),
					   numberbox({class:'vec2', value:this.value[1],margin:2}));

		} else if (typename =="FloatLike" || typename =="float32"){
			editor = view({bgcolor:NaN},
				       numberbox({class:'floatlike', minvalue: this.property.minvalue, maxvalue: this.property.maxvalue,  value:this.value}));

		} else if (typename =="IntLike" || typename =="int32"){
			editor = view({bgcolor:NaN},
					numberbox({flex:1, minvalue: this.property.minvalue, maxvalue: this.property.maxvalue, fontsize:this.fontsize, value:this.value, stepvalue:1, margin:2}));

		} else if (typename =="String"){
			editor = view({bgcolor:NaN},
					textbox({flex:1, fontsize:this.fontsize, fgcolor:"#d0d0d0",bgcolor:"#505050", value:this.value,padding:4, borderradius:0, borderwidth:1, bordercolor:"gray", margin:2})

			);
		} else if (typename =="Boolean" || typename=="BoolLike" || typename=="boolean") {

			editor = checkbox({
				flex:0,
				fgcolor:"white",
				bgcolor:NaN,
				value:this.value,
				padding:4,
				borderradius:0,
				borderwidth:2,
				bordercolor:"#262626",
				margin:2,
				onvalue:function(ev,val) {this.callback(val)}.bind(this)
			});

		} else if (typename == "Object" && meta == "font") {
			editor = label({fontsize: this.fontsize, margin:4,text:"FONT PICKER!", bgcolor:NaN, fgcolor:this.fgcolor});

		} else if (typename == "Object" && meta == "texture") {
			editor = label({fontsize: this.fontsize, margin:4,text:"IMAGE PICKER!", bgcolor:NaN, fgcolor:this.fgcolor});

		} else {
			if (!this.property) {
				return [];
			}
			console.log('UNKNOWN PROPERTY TYPE NAME', typename);
			editor = label({margin:4, text:typename + " " + meta, bgcolor:NaN, fgcolor:this.fgcolor});
		}

		return [
			label({bgcolor:NaN, margin:4, fontsize:this.fontsize, flex: 0.2, text:this.propertyname, bgcolor:NaN, fgcolor:this.fgcolor}),
			editor
		]
	}

})
