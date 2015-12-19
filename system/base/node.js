/* Copyright 2015 Teem2 LLC. Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.  
   You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0 Unless required by applicable law or agreed to in writing, 
   software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
   either express or implied. See the License for the specific language governing permissions and limitations under the License.*/

define.class(function(require, constructor){
	// Node class provides attributes for events and values, propertybinding and constructor semantics

	var Node = constructor

	var OneJSParser =  require('$system/parse/onejsparser')
	var WiredWalker = require('$system/parse/wiredwalker')
	var RpcProxy = require('$system/rpc/rpcproxy')

	// parser and walker for wired attributes
	var onejsparser = new OneJSParser()
	onejsparser.parser_cache = {}
	var wiredwalker = new WiredWalker()
	
	// the RPCProxy class reads these booleans to skip RPC interface creation for this prototype level
	this.rpcproxy = false

	// internal, called by the constructor
	this._atConstructor = function(){
		// store the args for future reference
		//var args = this.constructor_args = Array.prototype.slice.call(arguments)
		this.children =
		this.constructor_children = []
		this.initFromConstructorArgs(arguments)
	}

	// internal, called by the constructor
	this.initFromConstructorArgs = function(args){
		var off = 0
		for(var i = 0; i < args.length; i++){
			var arg = args[i]
			if(typeof arg === 'object' && Object.getPrototypeOf(arg) === Object.prototype){
				this.initFromConstructorProps(arg)
				continue
			}
			if(typeof arg === 'function'){
				var prop = {}; prop[arg.name] = arg
				this.initFromConstructorProps(prop)
				continue
			}
			if(typeof arg === 'string' && i === 0){
				off = 1
				this.name = arg
				continue
			}
			
			if(Array.isArray(arg)){
				this.initFromConstructorArgs(arg)
			}
			else if(arg !== undefined && typeof arg === 'object'){
				this.constructor_children.push(arg)
				var name = arg.name || arg.constructor && arg.constructor.name
				if(name !== undefined && !(name in this)) this[name] = arg
			}
		}		
	}

	// internal, called by the constructor
	this.initFromConstructorProps = function(obj){

		for(var key in obj){
			var prop = obj[key]
			var tgt = this
			var type = 0
		
			if(!this.constructor_props) this.constructor_props = {}
			this.constructor_props[key] = prop

			var idx = key.indexOf('.')
			if(idx !== -1){
				tgt = this[key.slice(0,idx)]
				key = key.slice(idx + 1)
			}

			tgt[key] = prop
		}
	}

	// the default render function, returns this.constructor_children
	this.render = function(){
		return this.constructor_children
	}

	// Mixes in another class or object, just pass in any number of object or class references. They are copied on key by key
	this.mixin = function(){
		for(var i = 0; i < arguments.length; i++){
			var obj = arguments[i]
			if(typeof obj == 'function') obj = obj.prototype
			for(var key in obj){
				// copy over getters and setters
				if(obj.__lookupGetter__(key) || obj.__lookupSetter__(key)){
					// ignore it
				}
				else{
					// other
					this[key] = obj[key]
				}
			}
		}	
	}

	// internal, used by find
	this.findChild = function(name, ignore){
		// ok so first we go down all children
		if(this === ignore) return
		if(this.name === name || this.name === undefined && this.constructor.name === name){
			return this
		}
		if(this.children) for(var i = 0; i < this.children.length; i ++){
			var child = this.children[i]
			if(child === ignore) continue
			var ret = child.findChild(name)
			if(ret !== undefined) return ret
		}
	}

	// find node by name, they look up the .name property or the name of the constructor (class name) by default
	this.find = function(name, ignore){
		var ret = this.findChild(name)
		var node = this
		while(ret === undefined && node.parent){
			ret = node.parent.findChild(name, node)
			node = node.parent
		}
		return ret
	}

	// hide a property, pass in any set of strings
	this.hideProperty = function(){
		for(var i = 0; i<arguments.length; i++){
			var arg = arguments[i]
			if(Array.isArray(arg)){
				for(var j = 0; j<arg.length; j++){
					Object.defineProperty(this, arg[j],{enumerable:false, configurable:true, writeable:true})
				}
			}
			else{
				Object.defineProperty(this, arg,{enumerable:false, configurable:true, writeable:true})
			}
		}
	}

	// check if property is an attribute
	this.isAttribute = function(key){
		var setter = this.__lookupSetter__(key)
		if(setter !== undefined && setter.isAttribute) return true
		else return false
	}

	// returns the attribute config object (the one passed into this.attributes={attr:{config}}
	this.getAttributeConfig = function(key){
		return this._attributes[key]
	}

	// check if an attribute has wires connected
	this.hasWires = function(key){
		var wiredfn_key = '_wiredfn_' + key
		return wiredfn_key in this
	}
	
	// internal, returns the wired-call for an attribute
	this.wiredCall = function(key){
		var wiredcl_key = '_wiredcl_' + key
		return this[wiredcl_key]
	}
	
	// emits an event recursively on all children
	this.emitRecursive = function(key, event, block){

		if(block && block.indexOf(child)!== -1) return
		this.emit(key, event);
		for(var a in this.children){
			var child = this.children[a]
			child.emitRecursive(key, event)
		}
	}
	
	// emit an event for an attribute key. the order 	
	this.emit = function(key, event){
		var on_key = 'on' + key
		var listen_key = '_listen_' + key

		var proto = this
		var stack

		while(on_key in proto){
			if(proto.hasOwnProperty(on_key)) (stack || (stack = [])).push(proto[on_key])
			proto = Object.getPrototypeOf(proto)
		}

		if(stack !== undefined) for(var j = stack.length - 1; j >=0; j--){
			stack[j].call(this, event)
		}

		var proto = this
		while(listen_key in proto){
			if(proto.hasOwnProperty(listen_key)){
				var listeners = proto[listen_key]
				for(var j = 0; j < listeners.length; j++){
					listeners[j].call(this, event)
				}
			}
			proto = Object.getPrototypeOf(proto)
		}
	}

	// add a listener to an attribute
	this.addListener = function(key, cb){
		var listen_key = '_listen_' + key
		var array 
		if(!this.hasOwnProperty(listen_key)) array = this[listen_key] = []
		else array = this[listen_key]
		if(array.indexOf(cb) === -1){
			array.push(cb)
		}
	}

	// remove a listener from an attribute, uses the actual function reference to find it
	// if you dont pass in a function reference it removes all listeners
	this.removeListener = function(key, cb){
		var listen_key = '_listen_' + key
		if(!this.hasOwnProperty(listen_key)) return
		var cbs = this[listen_key]
		if(cbs){
			if(cb){
				var idx = cbs.indexOf(cb)
				if(idx !== -1) cbs.splice(idx,1)
			}
			else{
				cbs.length = 0
			}
		}
	}

	// check if an attribute has a listener with a .name property set to fnname
	this.hasListenerName = function(key, fnname){
		var listen_key = '_listen_' + key
		var listeners = this[listen_key]
		if(!listeners) return false
		for(var i = 0; i < listeners.length; i++){
			if(listeners[i].name === fnname) return true
		}
		return false
	}

	// returns true if attribute has any listeners
	this.hasListeners = function(key){
		var listen_key = '_listen_' + key
		var on_key = 'on' + key
		if(on_key in this || listen_key in this && this[listen_key].length) return true
		return false
	}

	// remove all listeners from a node
	this.removeAllListeners = function(){
		var keys = Object.keys(this)
		for(var i = 0; i < keys.length; i++){
			var key = keys[i]
			if(key.indexOf('_listen_') === 0){
				this[key] = undefined
			}
		}
	}

	// set the wired function for an attribute
	this.setWiredAttribute = function(key, value){
		if(!this.hasOwnProperty('_wiredfns')) this._wiredfns = this._wiredfns?Object.create(this._wiredfns):{}
		this._wiredfns[key] = value
		this['_wiredfn_'+key] = value
	}


	// mark an attribute as persistent accross live reload / renders
	this.definePersist = function(arg){
		if (!this.hasOwnProperty("_persists")){
			
			if (this._persists){
				this._persists = Object.create(this._persists)
			}
			else{
				this._persists = {}
			}
		}
		this._persists[arg] = 1
	}




	// magical setters JSON API



	// pass an object such as {attrname:{type:vec2, value:0}, attrname:vec2(0,1)} to define attributes on an object
	Object.defineProperty(this, 'attributes', {
		get:function(){
			throw new Error("attribute can only be assigned to")
		},
		set:function(arg){
			for(var key in arg){
				this.defineAttribute(key, arg[key])
			}
		}
	})

	// define listeners {attrname:function(){}}
	Object.defineProperty(this, 'listeners', {
		get:function(){
			throw new Error("listeners can only be assigned to")
		},
		set:function(arg){
			for(var key in arg){
				this.addEventListener(key, arg[key])
			}
		}
	})

	// define setters {attrname:function(){}}
	Object.defineProperty(this, 'setters', {
		get:function(){
			throw new Error("setter can only be assigned to")
		},
		set:function(arg){
			for(var key in arg){
				this['_set_'+key] = arg[key] 
			}
		}
	})


	// define getters {attrname:function(){}}
	Object.defineProperty(this, 'getters', {
		get:function(){
			throw new Error("getter can only be assigned to")
		},
		set:function(arg){
			for(var key in arg){
				this['_get_'+key] = arg[key] 
			}
		}
	})

	// start animation by assigning keyframes to an attribute {attrname:{1:'red', 2:'green', 3:'blue'}}
	Object.defineProperty(this, 'animate', {
		get:function(){ return this.animateAttribute },
		set:function(arg){
			this.animateAttribute(arg)
		}
	})

	// internal, animate an attribute with an animation object see animate
	this.animateAttribute = function(arg){
		// count
		var arr = []
		for(var key in arg){
			var value = arg[key]
			if(typeof value === 'object'){
				var resolve, reject
				var promise = new Promise(function(res, rej){ resolve = res, reject = rej })
				promise.resolve = resolve
				promise.reject = reject
				arr.push(promise)
				this.startAnimation(key, undefined, value, promise)
			}
			else{
				if(typeof value === 'string'){
					value = value.toLowerCase()	
					if(value === 'stop'){
						this.stopAnimation(key)
					}
					else if(value === 'play'){
						this.playAnimation(key)
					}
					else if(value === 'pause'){
						this.pauseAnimation(key)
					}
				}
				resolve()
			}
		}
		if(arr.length <= 1) return arr[0]
		return Promise.all(arr)
	}

	// internal, define an attribute, use the attributes =  api
	this.defineAttribute = function(key, config){
		if(!this.hasOwnProperty('_attributes')){
			this._attributes = this._attributes?Object.create(this._attributes):{}
		}
		
		config.group = config.group?config.group:this.constructor.name;
		
		// lets create an attribute
		var value_key = '_' + key
		var on_key = 'on' + key
		var listen_key = '_listen_' + key
		var wiredfn_key = '_wiredfn_' + key
		//var config_key = '_cfg_' + key 
		var get_key = '_get_' + key
		var set_key = '_set_' + key

		if(this.isAttribute(key)){ // extend the config
			if('type' in config) throw new Error('Cannot redefine attribute '+key)
			var obj = Object.create(this._attributes[key])
			for(var prop in config){
				obj[prop] = config[prop]
			}
			this._attributes[key] = obj
			if(config.persist){
				if(config.alias) throw new Error('Cannot define a persist property '+key+' with alias, use the alias attribute '+config.alias)
				this.definePersist(key)
			}
			return
		}
		else{
			// autoprocess the config
			if(!(typeof config === 'object' && config && !Array.isArray(config) && !config.struct)){
				config = {value:config}
			}
			else if(!config.type) config = Object.create(config)

			if(!config.type){
				var value = config.value

				if(typeof value === 'object'){
					if(value && value.struct) config.type = value.struct
					else if(Array.isArray(value)) config.type = Array
					else config.type = Object
				}
				else if(typeof value === 'number'){
					config.type = float
				}
				else if(typeof value === 'boolean'){
					config.type = boolean
				}
				else if(typeof value === 'function'){
					config.type = value
					config.value = undefined
				}
			}
			if(config.persist){
				if(config.alias) throw new Error('Cannot define a persist property '+key+' with alias, use the alias attribute '+config.alias)
				this.definePersist(key)
			}
		}

		var init_value = key in this? this[key]:config.value
		if(init_value !== undefined && init_value !== null){
			if(typeof init_value === 'string' && init_value.charAt(0) === '$') init_value = this.parseWiredString(init_value)
			if(typeof init_value === 'function'){
				if(init_value.is_wired) this.setWiredAttribute(key, init_value)
				else this[on_key] = init_value
			}
			else{
				var type = config.type
				if(type && type !== Object && type !== Array){
					this[value_key] = type(init_value)
				}
				else{
					this[value_key] = init_value
				}
			}
		}
		this._attributes[key] = config
		
		if(config.wired) this[wiredfn_key] = config.wired

		var setter
		var getter
		// define attribute gettersetters

		// block attribute emission on objects with an environment thats (stub it)
		if(config.alias){
			var alias_key = '_' + config.alias
			
			setter = function(value){
				var mark
				if(this[set_key] !== undefined) value = this[set_key](value)
				if(typeof value === 'function' && (!value.prototype || Object.getPrototypeOf(value.prototype) === Object.prototype)){
					if(value.is_wired) this.setWiredAttribute(key, value)
					this[on_key] = value
					return
				}
				if(typeof value === 'object' && value instanceof Mark){
					mark = value.mark
					value = value.value
				}
				if(typeof value === 'object' && value !== null && value.atAttributeAssign){
					value.atAttributeAssign(this, key)
				}

				var config = this._attributes[key]


				if(!mark && config.motion){
					// lets copy our value in our property
					this[value_key] = this[alias_key][config.index]
					this.startAnimation(key, value)
					return
				}

				if(!this.hasOwnProperty(alias_key)){
					var store = this[alias_key]
					store = this[alias_key] = store.struct(store)
				}
				else{
					store = this[alias_key]
				}

				this[value_key] = store[config.index] = value

				// emit alias
				this.emit(config.alias, {setter:true, via:key, key:config.alias, owner:this, value:this[alias_key], mark:mark})

				if(this.atAttributeSet !== undefined) this.atAttributeSet(key, value)
				if(on_key in this || listen_key in this) this.emit(key,  {setter:true, key:key, owner:this, value:value, mark:mark})
			}

			this.addListener(config.alias, function(event){
				var val = this[value_key] = event.value[config.index]
				if(on_key in this || listen_key in this)  this.emit(key, {setter:true, key:key, owner:this, value:val, mark:event.mark})
			})
			// initialize value
			this[value_key] = this[alias_key][config.index]
		}
		else {
			setter = function(value){
				var mark
				if(this[set_key] !== undefined) value = this[set_key](value)
				if(typeof value === 'function' && (!value.prototype || Object.getPrototypeOf(value.prototype) === Object.prototype)){
					if(value.is_wired) this.setWiredAttribute(key, value)
					this[on_key] = value
					return
				}
				if(typeof value === 'object' && value instanceof Mark){
					mark = value.mark
					value = value.value
				}
				if(typeof value === 'object' && value !== null && value.atAttributeAssign){
					value.atAttributeAssign(this, key)
				}

				var config = this._attributes[key]
			
				var type = config.type
				if(type){
					if(type !== Object && type !== Array) value = type(value)
				}

				if(!mark && config.motion && this.startAnimation(key, value)){

					// store the end value
					return
				}

				this[value_key] = value

				if(this.atAttributeSet !== undefined) this.atAttributeSet(key, value)
				if(on_key in this || listen_key in this)  this.emit(key, {setter:true, owner:this, key:key, value:value, mark:mark})
			}
		}
		
		setter.isAttribute = true
		Object.defineProperty(this, key, {
			configurable:true,
			enumerable:true,
			get: function(){
				if(this.atAttributeGet !== undefined) this.atAttributeGet(key)
				var getter = this[get_key]
				if(getter !== undefined) return getter()
				// lets check if we need to map our stored type
				// if we are in motion, we should return the end value
				return this[value_key]
			},
			set: setter
		})
	}

	// internal, connect a wired attribute up to its listeners
	this.connectWiredAttribute = function(key, initarray){
		var wiredfn_key = '_wiredfn_' + key
		var wiredcl_key = '_wiredcl_' + key
		var wiredfn = this[wiredfn_key]
		var ast = onejsparser.parse(wiredfn.toString())
		var state = wiredwalker.newState()

		wiredwalker.expand(ast, null, state)

		var bindcall = function(){
			var deps = bindcall.deps
			if(deps && !bindcall.initialized){
				bindcall.initialized = true
				for(var i = 0; i < deps.length; i++) deps[i]()
			}
			this[key] = this[wiredfn_key].call(this)
		}.bind(this)

		this[wiredcl_key] = bindcall

		for(var j = 0; j < state.references.length; j++){
			var ref = state.references[j]
			var obj = {'this':this}
			for(var k = 0; k < ref.length; k++){

				var part = ref[k]
				if(k === ref.length - 1){
					// lets add a listener 
					if(!obj.isAttribute(part)){
						console.log("Attribute does not exist: "+ref.join('.')+" in wiring " + this[wiredfn_key].toString())
						continue
					}

					obj.addListener(part, bindcall)

					if(obj.hasWires(part) && !obj.wiredCall(part)){
						obj.connectWiredAttribute(part)
						if(!bindcall.deps) bindcall.deps = []
						bindcall.deps.push(obj.wiredCall(part))
					}
				}
				else{
					var newobj = obj[part]
					if(!newobj){
						if(obj === this){ // lets make an alias on this, scan the parent chain
							while(obj){
								if(part in obj){
									if(part in this) console.log("Aliasing error with "+part)
									//console.log("ALIASING" + part, this)
									obj = this[part] = obj[part]
									break
								}
								obj = obj.parent
							}
						}
					}	
					else obj = newobj
					if(!obj) console.log('Cannot find part ' + part + ' in ' + ref.join('.') + ' in propertybind', this)
				}
			}
		}
		if(initarray) initarray.push(bindcall)
	}
	
	// return a function that can be assigned as a listener to any value, and then re-emit on this as attribute key
	this.emitForward = function(key){
		return function(value){
			this.emit(key, value)
		}.bind(this)
	}
	
	// internal, connect all wires using the initarray returned by connectWiredAttribute
	this.connectWires = function(initarray, depth){

		var immediate = false
		if(!initarray) initarray = [], immediate = true

		if(this._wiredfns){
			for(key in this._wiredfns){
				this.connectWiredAttribute(key, initarray)
			}
		}
		// lets initialize bindings on all nested classes
		var nested = this.constructor.nested
		if(nested) for(var name in nested){
			var nest = this[name.toLowerCase()]
			if(nest.connectWires){
				nest.connectWires(initarray, depth)
			}
		}
		if(immediate === true){
			for(var i = 0; i < initarray.length; i++){
				initarray[i]()
			}
		}
	}

	// internal, does nothing sofar
	this.disconnectWires = function(){
	}

	// internal, used by the attribute setter to start a 'motion' which is an auto-animated attribute
	this.startMotion = function(key, value){
		if(!this.screen) return false 
		return this.screen.startMotion(this, key, value)
	}

	// internal, create an rpc proxy
	this.createRpcProxy = function(parent){
		return RpcProxy.createFromObject(this, parent)
	}

	// mixin setter API to easily assign mixins using an is: syntax in the constructors
	Object.defineProperty(this, 'is', {
		set:function(value){
			// lets copy on value. 
			if(Array.isArray(value)){
				for(var i = 0; i<value.length; i++) this.is = value[i]
				return
			}
			if(typeof value === 'function') value = value.prototype
			if(typeof value === 'object'){
				for(var key in value){
					this[key] = value[key]
				}
			}
		}
	})

	this.hideProperty(Object.keys(this))

	// always define an init and deinit
	this.attributes = {
		// the init event, not called when the object is constructed but specifically when it is being initialized by the render
		init:Event, 
		// deinit event, called on all the objects that get dropped by the renderer on a re-render
		deinit:Event
	}
})
