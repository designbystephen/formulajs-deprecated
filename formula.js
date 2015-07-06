/*	
 *	Formula.js - Rich form development
 *	
 * 	Copyright (c) 2011 Stephen Roth (designbystephen-at-gmail-dot-com)
 *
 *  For details, see the Formula web site: http://www.formulajs.com/
 * 	
 *	Permission is hereby granted, free of charge, to any person obtaining a copy of this 
 *  software and associated documentation files (the "Software"), to deal in the Software 
 *  without restriction, including without limitation the rights to use, copy, modify, 
 * 	merge, publish, distribute, sublicense, and/or sell copies of the Software, and to 
 *	permit persons to whom the Software is furnished to do so, subject to the following 
 *	conditions:
 *	
 *	The above copyright notice and this permission notice shall be included in all copies 
 *	or substantial portions of the Software.
	
 * 	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, * 	
 *	INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
 *	PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
 *	HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
 *	CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE * 
 *	OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var Formula = Class.create({
	version: '0.0.12',
	Options: {
		/**
		 *	Initial Options 
		 */
		defaultMessage: "Errors on this form are marked in red",
		ignoreValidation: false
	}, //Options{}
	initialize: function(){
		Element.addMethods(this.Element);
		for(f in this.Array){
			Array.prototype[f] = this.Array[f];
		}
		document.observe('dom:loaded', function(){
			Formula.load();
		});
	}, //initialize()
	load: function(){
		/*
		 *	This function is loaded after page dom:loaded event
		 */
		// Prepare forms on this page
		this.prepareForms();
		
		// Prepare placeholders on this page if unsupported by HTML5
  		var i = document.createElement('input');
  		if(!('placeholder' in i)){
  			this.preparePlaceholders();
  		}
	
		
	}, //load()
	preparePlaceholders: function(){
		$$('input[placeholder]').each(function(plh){
			plh.writeAttribute({
				'formula_placeholder': plh.readAttribute('placeholder')
			});
			
			plh.value = plh.readAttribute('placeholder');
			plh.addClassName('formula-placeholder');
			
			// Events
			$w('click drop focus').each(function(ename){
				plh.observe(ename, clearPlaceHolder.bind(plh));
			});
		
			plh.observe('blur', resetPlaceHolder.bind(plh));
			plh.up('form', 0).observe('submit',clearPlaceHolder.bind(plh));
			plh.up('form', 0).observe('reset', function(){
				function rst(){
					plh.value = plh.readAttribute('formula_placeholder');
					plh.addClassName('formula-placeholder');
				}
				rst.defer();
			});
		});
		
		function clearPlaceHolder(e){
			if(this.value == this.readAttribute('formula_placeholder')){
				this.value = '';
				this.removeClassName('formula-placeholder');
			}
		}
		
		function resetPlaceHolder(e){
			if(this.value == '' ){
				this.value = this.readAttribute('formula_placeholder');
				this.addClassName('formula-placeholder');
			}
		}
	}, //preparePlaceholders
	log: function(errorString){
		if(typeof(console) === 'undefined'){
			var err = new Error('formula.js: ' + errorString);
			throw err;
		}else{
			console.log(errorString);
		}
	}, //log()
	setup: function(options){
		/**
		 *	Overide default options to setup Formula usage on a page
		 */
		
		Formula.Options = Formula.mate(Formula.Options, options);
	}, //setup()
	showErrorMessage: function(errors){
		errors[0].ind.scrollTo();
		var msg = errors[0].msg + '\r\n' + Formula.Options.defaultMessage;
		alert(msg);
	}, //showErrorMessage
	prepareForms: function(){
		if($$('form').length<1){Formula.log('No forms exist on this page')}
		
		$$('form').each(function(form){
			form._ignoreValidation = (form._ignoreValidation||false);
			form.valid = true;
			
			function validate(event){
				Event.stop(event);
				
				form.valid = true;
				form.errors = [];
				
				form.fire('Formula:validate');
				
				function checkForm(){
					if (form.valid) {
						form.submit();
					}else{
						Formula.showErrorMessage(form.errors);
					}
				}
				
				checkForm.defer();
			}	
				
			form.observe('submit', validate.bind(this));
			form._validateHandler = validate;
			
			form.observe('reset',function(){
				function formulaReset(){
					form.fire('Formula:reset');
				}
				formulaReset.defer();
			});
			
		});
	}, //prepareForms()
	Validation: Class.create({
		// Basic information, can be inherited
	
	   	/*
	 	 *	Every Validation has the following:
	 	 *	Function that it runs to determine validity (f)
	 	 *  A user element that is being validated (element)
	 	 *  A form that the element belongs to
	 	 *  A set of options to extend the function beyond defaults
	 	 */
	 
	 	initialize: function(element, func, defaultMsg, options){
	 		// Make sure element exists
	 		element = $(element);
	 		options = (options ||{});
	 		
	 		// Grab element's parent form
	 		var form;
	 		if(element.isType('form')){
	 			form = element;
	 		}else{
	 			form = (element.up('form', 0)||null);
	 		}
	 		if(!form){
	 			Formula.log('No form present for Validation element');
	 			return null;
	 		}
	 	
	 		// Optional information must extend basic Validation class
	 		var _options = {
	 			cond: true,
	 			msg: null,
	 			ind: null,
				useControl: false
	 		}
	 		
			// Collect options data using defaults and user specified options
	 		options = Formula.mate(_options, options);
			
			/**
			 * Establish Error Msg
			 */
			
			var titleMsg = function(title){
				if(title){
					return 'Please correct an error with "' + title + '"';
				}else{
					return false;
				}
			}
			
			options.msg = (options.msg||titleMsg(element.title)||defaultMsg);
			
			
			/**
			 * 	Establish Error Indicator (ind) 
			 */ 
			
			if(options.ind)options.ind=$(options.ind);
			
			if (!options.ind) {
				// User specified indicator not present
				
				if (options.useControl) {
					// User has not specified an indicator, element = textbox, and useControl is != false
					options.ind = element;
				}else{
					// highlight a label if we find it
					$$('label').each(function(l){
						if (l.htmlFor == element.id) {
							options.ind = l;
						}
					});
				}
			}
			
			if(!options.ind){
				// User specified and assumed ind not found
				Formula.log('Formula.Validation: an error indicator was not specified');
				return null;
			}
			
			
			form.observe('Formula:validate', function(){
				if(!Formula.Options.ignoreValidation && !form._ignoreValidation){
					if(!element.displayed()){
						form.unmarkError(options.ind);
						return;
					}
						
					if(Object.isString(options.cond) && eval(options.cond)===false){
						form.unmarkError(options.ind);
						return;
					}
					
					if(Object.isFunction(options.cond) && options.cond()===false){
						form.unmarkError(options.ind);
						return;
					}
					
					if(Object.isFunction(func)){
						if (!func()) {
							form.valid = false;
							form.markError(options.ind, options.msg);
						}else{
							form.unmarkError(options.ind);
						}
					}else{
						if (eval(func) != true) {
							form.valid = false;
							form.markError(options.ind, options.msg);
						}else{
							form.unmarkError(options.ind);
						}
					}
				}
			});
			
			
	 		form.observe('Formula:reset',function(){
				form.unmarkError(options.ind);
			});
	 		
	 		return element;
	 	}	
	}), //Validation{}
	Unveil: Class.create({
		initialize: function(element, container, f, pEvent, options){
			element = $(element);
			container = $(container);
			
			_options = {
				//default unveil options
				veil: false
			}
			
			options = Formula.mate(_options, (options||{}));
			
			var showHide = function(){
				if(f()){
					(options.veil) ? container.hide(): container.show();
				}else{
					(options.veil) ? container.show(): container.hide();
				}
			}
			
			showHide();
			
			element.observe(pEvent, function(){
				showHide();
			});
			
			// Grab element's parent form
 			var form = (container.up('form', 0) || null);
 			if(!form){
 				Formula.log('Unveil No form present for Unveil container');
 				return null;
 			}
 			
 			form.observe('Formula:reset',function(){
 				showHide();
 			});
		}
	}), //Unveil{}
	mate: function(collection, extension){
		/*
		 *	Used primarily to mimic inheritance of option collections for methods
		 *  Collection is the default set of options
		 *	Extension is the second set of options that: 
		 *  inherits collection's properties and overwrites with new values if present
		 */
		 
		var offspring = collection;
		
		for (var prop in extension) {
			offspring[prop] = extension[prop]; 
		}
		
		return offspring;
	}, //mate()
	Element: {
		/**
		 *	Utility Methods
		 */
		toggleUpdate: function(element, text){
			if(element.innerText != text){
				element._innerText = element.innerText;
				element.innerText = text;
			}else{
				element.innerText = element._innerText 
			}
			
			return element;
		}, //toggleUpdate()
		displayed: function(element){
			 var visible = true;
        	// Where element = any element
        	element.ancestors().each(function (nest) {
        	    if (nest.style.display.toLowerCase() == 'none' || 
                    nest.style.visibility.toLowerCase() == 'hidden' || 
                    !(nest.offsetWidth > 0 && nest.offsetHeight > 0)) {
                	visible = false;
            	}
       	 	});
        	return visible;
		}, //displayed()
		isType: function(element, type){
		 	/*
		 	 *	Determines if element is of psuedotype 'type'
		 	 *	pseudotype is either tag name or input type
		 	 *  select, checkbox, textbox, radio
		 	 */
		 	 
		 	element = $(element);
			
			var psuedotype;
			if(element.tagName.toLowerCase()!= 'input'){
				psuedotype = element.tagName.toLowerCase();
			}else{
				psuedotype = element.type.toLowerCase();
			}
			
			if($w(type).length > 1){
				type = $w(type);
			}
			
			if(!Object.isArray(type)){
				return psuedotype === type.toLowerCase();
			}else{
				var istype = false;
				type.each(function(t){
					if(t.toLowerCase() == psuedotype){
						istype = true;
					}
				});
				return istype;
			}
		}, //Element.isType()
		 
		/**
		 *	Validation Methods
		 */
		textRequire: function(element, options){
			element = $(element);
			options = (options||{});
			
			if(!element.isType('text textarea password')){
				Formula.log('Element.textRequire requires a valid textbox, password or textarea element');
				return null;
			}
			var f = function(){
				if($F(element) == ''){
					return false;
				}else{
					return true;
				}
			}
			
			new Formula.Validation(element, f, 'A required textbox is blank', options);
			
			return element;
		}, //Element.textRequire()
		regexpRequire: function(element, regexp, options){
			element = $(element);
			options = (options||{});
			
			if(!element.isType('text textarea')){
				Formula.log('Element.regexRequire requires a valid textbox or textarea element');
				return null;
			}
			
			try {
				regexp = new RegExp(regexp);
			}catch(e){
				Formula.log('Element.regexRequire regexp is not a valid Regular Expression');
				return null;
			}
			
			var f = function(){
				return regexp.test($F(element));
			}
			
			new Formula.Validation(element, f, 'A textbox is in invalid format', options);
			
			return element;
		}, //Element.regexRequire()
		selectRequire: function(element, def, options){
			element = $(element);
			options = (options||{});
			if(!element.isType('select')){
				Formula.log('Element.selectRequire requires a valid select element');
				return null;
			}
			
			var f = function(){
				def=(def||0);
				
				if(Object.isString(def)){
					return element.options[element.selectedIndex].text!=def;
				}
				
				if(Object.isNumber(def)){
					return element.selectedIndex != def;
				}
			}
			
			new Formula.Validation(element, f, 'A required dropdownlist is unchanged', options);
			
			return element;
		}, //Element.selectRequire()
		checkRequire: function(element, options){
			element = $(element);
			options = (options || {});
			
			if(!element.isType('checkbox')){
				Formula.log('Element.checkRequire requires a valid checkbox element');
				return null;
			}
			
			var f = function(){return element.checked};
			
			new Formula.Validation(element, f, 'A required checkbox is unchecked', options);
			
			return element;
	    }, //Element.checkRequire()
		checkGroupRequire: function(element, req, ind, options){
			element = $(element);
			options = (options||{});
			
			if(!ind){
				Formula.log('Element.checkGroupRequire() requires an indicator argument');
				return null;
			}else{
				options.ind = ind;
			}
			
			if(element!=null){
				//Container list
				var f = function(){
					var cbCount = 0;
					element.select('input[type~="checkbox"]').each(function(cb){
						if(cb.checked)cbCount+=1;
					});
					
					if(Object.isString(req)){
						var check = eval(cbCount+req);
						if(check==true || check==false){
							return check;
						}else{
							Formula.log('String based condition not found for Element.checkGroupRequire()');
							return true;
						}
					}
						
					if(Object.isNumber(req)){
						return cbCount >= req;
					}
					new Formula.Req(element, f, options);
			
					return element;
				}
			}else{
				Formula.log('Element.checkGroupRequire() requires a container element');
				return null;
			}
			
			new Formula.Validation(element, f, 'Required checkbox(es) from a group are unchecked', options);
			
			return element;
		}, //Element.checkGroupRequire()
	    radioRequire: function(element, ind, options){
			element = $(element);
			options=(options||{});
			
			if(!element.name){
				Formula.log('Element.radioRequire requires a radio element with a name');
				return null;
			}
			
			if(!ind){
				Formula.log('Element.radioRequire requires an indicator argument');	
				return null;
			}else{
				options.ind = ind;
			}
			
			var f = function(){
				var chk = false;
				$$('input[type~="radio"][name~="'+ element.name +'"]').each(function(rb){
					if(rb.checked)chk=true;
				});
				return chk;
			}
			
			new Formula.Validation(element, f, 'Required radio button group is unchecked', options);
			
			return name;
		}, //Element.radioGroupRequire()
		addCustomValidation: function(element, ind, msg, f, options){
			element = $(element);
			options = (options||{});
			
			if(!element.isType('form'))Formula.log('Element.addCustomValidation requires a form element');
			
			options.ind = ind;
			options.msg = msg;
			new Formula.Validation(element, f, 'A required custom validator is false', options);
			return element;
			
		}, //Element.addCustomValidation()
		ignoreValidation: function(element){
			element = $(element);
			if(!element.isType('form')){
				Formula.log('Element.ignoreValidation requires a form element');
				return null;
			}
			element._ignoreValidation = true;
			return element;
		}, //Element.ignoreValidation()
		escapeValidation: function(element){
			/*
			 * 	Used when you must submit a form while ignoring the validation.
			 * 	This is useful if you only have one form on the page and you have other unrelated submit tasks.
			 */
			
			element = $(element);
			if(!element.isType('form')){
				Formula.log('Element.escapeValidation requires a form element');
				return null;
			}
			
			element.stopObserving('submit', element._validationHandler);
			return element;
		},
		
		/**
		 *	 Unveil Methods
		 */
		checkUnveil: function(element, container, options){	
			element = $(element);
			
			options = (options||{});
			
			if(!element.isType('checkbox')){
				Formula.log('Element.checkUnveil requires a checkbox element');
				return null;
			}
			if(!container)Formula.log('Element.checkUnveil requires a container argument');
			
			var f = function(){
				return element.checked;
			}
			
			new Formula.Unveil(element, container, f, 'click', options);
			
			return element;
			
		}, //Element.checkUnveil()
		selectUnveil: function(element, values, container, options){
			element = $(element);
			container = $(container);
			options = (options||{});
			
			if(!element.isType('select'))Formula.log('Element.selectUnveil requires a dropdownlist element');
			if(!container)Formula.log('Element.selectUnveil requires a container argument');
		
			function selectEquals(value){
				if(Object.isNumber(value)){
					return element.selectedIndex == value;
				}else if(Object.isString(value)){
					return $F(element) == value;
				}else{
					return false;
				}
			}
			
			if(Object.isArray(values) &&  values.length > 0){
				var f = function(){
					var selected = false;
					values.each(function(v){
						if(selectEquals(v)){
							selected = true;
						}
					});
					return selected;
				}
			}else{
				var f = function(){
					return selectEquals(values);
				}
			}
			
			new Formula.Unveil(element, container, f, 'change', options);
			return element;
		}, //Element.selectUnveil()
		radioUnveil: function(element, container, options){
			element = $(element);
			container = $(container);
			if(!element.isType('radio')){
				Formula.log('Element.radioUnveil requires a radiobutton element');
				return null;
			}
			
			element.observe('click', function(){
				element.fire('rb:change');
				$$('input[type="radio"][name="' + element.name + '"]').each(function(rb){
					if(rb!=element){
						rb.fire('rb:change');
					}
				});
			});
			
			function f(){
				return element.checked;
			}
			
			new Formula.Unveil(element, container, f, 'rb:change', options);
			
			return element;
		},//Element.radioUnveil()
		addCustomUnveil: function(element, container, pEvent, f, options){
			element = $(element);
			container = $(container);
			options = (options||{});
			
			if(!container){
				Formula.log('Element.addCustomUnveil requires a container element'); 
				return null;
			}
			if(!element.isType('checkbox select text textarea radio password')){
				Formula.log('Element.addCustomUnveil requires an input, or textarea as its element'); 
				return null;
			}
			
			if(!Object.isString(pEvent)){
				Formula.log('Element.addCustomUnveil requires an event string'); 
				return null;
			}
			
			new Formula.Unveil(element, container, f, pEvent, options);
			
			return element;
		}, //Element.addCustomUnveil()
		
		/**
		 *	Check Methods/Other Methods 
		 */
		toggleCheckAll: function(element, options){
			element = $(element);
			options = (options||{});
						
			var allCheck = true;
			element.select('input[type~="checkbox"]').each(function(cb){
				if(!cb.checked)allCheck = false;
			});
			
			element.select('input[type~="checkbox"]').each(function(cb){
				(allCheck) ? cb.checked = false : cb.checked = true;
			});
		}, //toggleCheckAll()
		checkGroup: function(element, req, options){
			element = $(element);
			
			options = (options||{});
			req = (req||1);
			
			if(!element){
				Formula.log('Element.checkGroup() requires a container element'); 
				return null;
			}
			
			var cbs = element.select('input[type~="checkbox"]');
			
			if(!cbs || cbs.length==0){
				Formula.log('Element.checkGroup() no checkboxes were found');
				return null;
			}
			
			cbs.each(function(cb){
				cb.observe('click', doCheck);
			});
			
			function doCheck(event){
				Event.stop(event);
				
				var checkCount = 0;
				cbs.each(function(cb){
					if(cb.checked)checkCount+=1;
				});
				
				function reqMet(){
					if(Object.isNumber(req)){
						if(checkCount>=req){
							return true;
						}else{
							return false;
						}
					}
					
					if(Object.isString(req)){
						var check = eval(checkCount+req);
						if(check==true || check==false){
							return check;
						}else{
							Formula.log('String based condition not found for Element.checkGroup()');
							return true;
						}	
					}
				}
				
				if(reqMet()){
					this.checked=false; 
				}else{
					this.checked=true;
				}
			}
			
			return element;		
		}, //checkGroup()
		checkLimit: function(element, limit, options){
			element = $(element);
			
			options = (options||{});
			limit = (limit||1);
			
			if(!element){
				Formula.log('Element.checkGroup() requires a container element'); 
				return null;
			}
			
			var cbs = element.select('input[type~="checkbox"]');
			
			if(!cbs || cbs.length==0){
				Formula.log('Element.checkGroup() no checkboxes were found');
				return null;
			}
			
			cbs.each(function(c){
				c.observe('click', function(){
					var checkCount=0;
					
					cbs.each(function(cb){
						if(cb != c&&cb.checked){
							checkCount+=1;
						}
					});
					console.log(checkCount);
					if(checkCount+1>limit){
						this.checked=false;
					}
				});
			});
			
			return element;
		}, //checkLimit()
		markError: function(form, ind, message){
			if(!ind.hasClassName('formula-error-input') && ind.isType('text textarea select')){
				ind.toggleClassName('formula-error-input');
			}
			
			if(!ind.hasClassName('formula-error-text') && !ind.isType('text textarea select')){
				ind.toggleClassName('formula-error-text');
			}
			
			if(ind.style.display == 'none'){
				ind._wasHidden = true;
				ind.show();
			}
			
			form.errors.push({ind: ind, msg: message});
			
		}, //markError()
		unmarkError: function(form, ind){
			ind.removeClassName('formula-error-input');
			ind.removeClassName('formula-error-text');
			if(ind._wasHidden){
				ind.style.display = 'none';
			}
		} //unmarkError()
		
	}, //Element{}
	Array: {
		checkGroup: function(req, options){
			options = (options||{});
			req = (req||1);
			
			var list = this;
			
			if(!list || list.length==0){
				Formula.log('Array.checkGroup() no checkboxes were found');
				return null;
			}
			
			list.each(function(cb){
				var cb = $(cb);
				if(!cb.isType('checkbox')){
					Formula.log('Array.checkGroup: list items need to be checkboxes');
					return null;
				}else{
					cb.observe('click', doCheck);
				}
			});
			
			function doCheck(event){
				Event.stop(event);
				
				var checkCount = 0;
				list.each(function(cb){
					cb = $(cb);
					if(cb.checked)checkCount+=1;
				});
				
				function reqMet(){
					if(Object.isNumber(req)){
						if(checkCount>=req){
							return true;
						}else{
							return false;
						}
					}
					
					if(Object.isString(req)){
						var check = eval(checkCount+req);
						if(check==true || check==false){
							return check;
						}else{
							Formula.log('String based condition not found for Element.checkGroup()');
							return true;
						}	
					}
				}
				
				if(reqMet()){
					this.checked=false;
				}else{
					this.checked=true;
				}
			}
		}//Array.checkGroup()
	} //Array{}
});
if(typeof Prototype == 'undefined'){
	throw('Missing Required Scripts');
}else{
	Formula = new Formula();
}
