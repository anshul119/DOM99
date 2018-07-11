/* dom99 v14.4.0 */
	/*        Copyright Cyril Walle 2018.
Distributed under the Boost Software License, Version 1.0.
    See accompanying file LICENSE.txt or copy at
         https://www.boost.org/LICENSE_1_0.txt */

'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
Creates an element with elementDescription 

@param {object} elementDescription tagName key is required

@return {Element}
*/
const createElement2 = function (elementDescription) {
	/*element.setAttribute(attr, value) is good to set
	initial attribute like when html is first loaded
	setAttribute won't change some live things like .value for input,
	for instance, setAttribute is the correct choice for creation
	element.attr = value is good to change the live values
	always follow these words to avoid rare bugs*/
	const element = document.createElement(elementDescription.tagName);
	Object.entries(elementDescription).forEach(function ([key, value]) {
		if (key !== `tagName`) {
			element.setAttribute(key, value);
		}
	});
	return element;
};

/**
@private

@param {any} x
@return {boolean}
*/
const isObjectOrArray = function (x) {
	/*array or object*/
	return typeof x === `object` && x !== null;
};

const copyArrayShallow = function (array) {
	return array.slice();
};

/**
	freezes HTMLCollection or Node.childNodes
	by returning an array that does not change
	
		
	@param {arrayLike} liveCollection
	@return {array}
*/
const freezeLiveCollection = function (liveCollection) {
	const length = liveCollection.length;
	const frozenArray = [];
	let i;
	for (i = 0; i < length; i += 1) {
		frozenArray.push(liveCollection[i]);
	}
	return frozenArray;
};

/*todo compare with different implementation:

const freezeLiveCollection = function (liveCollection) {
	return Array.prototype.slice.call(liveCollection);
};
*/

/*idGenerator()

generates a predictable new id each time
perfect for DOM id requirements
*/

const prefix = `id-`;

let next = Number.MAX_SAFE_INTEGER;

const idGenerator = function () {
	const id = `${prefix}${next}`;
	next -= 1;
	return id;
};

const ELEMENT_NODE = 1; // document.body.ELEMENT_NODE === 1
const hasOwnProperty = Object.prototype.hasOwnProperty;


const NAME = `DOM99`;
const CONTEXT = `${NAME}_C`;
const LIST_ITEM_PROPERTY = `${NAME}_L`;
const ELEMENT_PROPERTY = `${NAME}_E`;
const ELEMENT_LIST_ITEM = `${NAME}_I`;
const CUSTOM_ELEMENT = `${NAME}_X`;
const LIST_CHILDREN = `${NAME}_R`;
const INSIDE_SYMBOL = `>`;

const variableSubscribers = {};
const listSubscribers = {};

/**
Retrieve variable values that have been modified by d.feed or 
2 way data binded element with data-variable attribute (Read only)

@param {string} path

@return {any}
*/
const variables = {};

/**
Retrieve elements that have data-element attribute (Read only)

@param {string} path

@return {Element}
*/
const elements = {};
const templateFromName = {};

/**
Set event listener that are going to be attached to elements
with data-function

@param {string} name

@return {function}
*/
const functions = {};

let pathIn = [];

const functionPlugins = [];
let alreadyHooked = false;
const feedPlugins = [];
const clonePlugins = [];
let cloneHook = function () {};

let directivePairs;

const pushOrCreateArrayAt = function (object, key, valueToPush) {
  // don't need to use hasOwnProp as there is no array in the prototype
  // but still use it to avoid a warning
  // const potentialArray = object[key]
	if (hasOwnProperty.call(object, key)) {
		// eventually the if is always true
		object[key].push(valueToPush);
	} else {
		// only for the first time
		object[key] = [valueToPush];
	}
};

const MISS = `MISS`;
const valueElseMissDecorator = function (object) {
	/*Decorator function around an Object to provide a default value
	Decorated object must have a MISS key with the default value associated
	Arrays are also objects
	*/
	return function (key) {
		if (hasOwnProperty.call(object, key)) {
			return object[key];
		}
		return object[MISS];
	};
};

const propertyFromTag = valueElseMissDecorator({
	//Input Type : appropriate property name to retrieve and set the value
	[`INPUT`]: `value`,
	[`TEXTAREA`]: `value`,
	[`PROGRESS`]: `value`,
	[`SELECT`]: `value`,
	[`IMG`]: `src`,
	[`SOURCE`]: `src`,
	[`AUDIO`]: `src`,
	[`VIDEO`]: `src`,
	[`TRACK`]: `src`,
	[`SCRIPT`]: `src`,
	[`OPTION`]: `value`,
	[`LINK`]: `href`,
	[`DETAILS`]: `open`,
	MISS: `textContent`
});

const propertyFromInputType = valueElseMissDecorator({
	//Input Type : appropriate property name to retrieve and set the value
	[`checkbox`]: `checked`,
	[`radio`]: `checked`,
	MISS: `value`
});

const inputEventFromType = valueElseMissDecorator({
	[`checkbox`]: `change`,
	[`radio`]: `change`,
	[`range`]: `change`,
	[`file`]: `change`,
	MISS: `input`
});

const eventFromTag = valueElseMissDecorator({
	[`SELECT`]: `change`,
	[`TEXTAREA`]: `input`,
	[`BUTTON`]: `click`,
	MISS: `click`
});

/**
internal dom99 options, look at dom99ConfigurationExample.js	
to learn how to configure it
*/
const options = {
	doneSymbol: `*`,
	tokenSeparator: `-`,
	listSeparator: ` `,
	directives: {
		function: `data-function`,
		variable: `data-variable`,
		element: `data-element`,
		list: `data-list`,
		inside: `data-inside`,
		template: `data-template`
	},

	propertyFromElement: function (element) {
		// defines what is changing when data-variable is changing
		// for <p> it is textContent
		let tagName;
		if (element.tagName !== undefined) {
			tagName = element.tagName;
		} else {
			tagName = element;
		}
		if (tagName === `INPUT`) {
			return propertyFromInputType(element.type);
		}
		return propertyFromTag(tagName);
	},

	eventNameFromElement: function (element) {
		// defines the default event for an element
		// i.e. when data-function is omitting the event
		const tagName = element.tagName;
		if (tagName === `INPUT`) {
			return inputEventFromType(element.type);
		}
		return eventFromTag(tagName);
	},

	tagNamesForUserInput: [
		`INPUT`,
		`TEXTAREA`,
		`SELECT`,
		`DETAILS`
	]
};

const elementsDeepForEach = function (startElement, callBack) {
	callBack(startElement);
	// https://developer.mozilla.org/en-US/docs/Web/API/ParentNode/firstElementChild
	// is not supported in Edge/Safari on DocumentFragments
	// let element = startElement.firstElementChild;
	// this does not produce an error, but simply returns undefined
	let node = startElement.firstChild;
	while (node) {
		if (node.nodeType === ELEMENT_NODE) {
			elementsDeepForEach(node, callBack);
			node = node.nextElementSibling;
		} else {
			node = node.nextSibling;
		}
	}

};

const customElementNameFromElement = function (element) {
	const isAttributeValue = element.getAttribute(`is`);
	if (isAttributeValue) {
		return isAttributeValue;
	}
	return element.tagName.toLowerCase();
};

const addEventListener = function (element, eventName, callBack, useCapture = false) {
	element.addEventListener(eventName, callBack, useCapture);
};

const cloneTemplate = function (template) {
	if (!template) {
		console.error(
			`Template missing <template ${options.directives.template}="d-name">
				Template Content
			</template>`
		);
	}
	if (!template.content) {
		console.error(
			`template.content is undefined, this can happen if a template is inside another template. Use only top level templates, also use recommended polyfills`
		);
	}
	return document.importNode(template.content, true);
};


/**
contextFromEvent gets the starting path for an event issued inside a component

in combination with contextFromArray it allows to access sibling elements and variables

d.functions.clickedButton = function (event) {
	d.elements[d.contextFromArray([contextFromEvent(event), `other`])]
		.classList.add(`active`);
};
 
@param {Event} event 

@return {string} path
*/
const contextFromEvent = function (event, parent) {
	if (event || parent) {
		let element;
		if (event && event.target) {
			element = event.target;
		} else {
			element = parent;
		}

		if (hasOwnProperty.call(element, CONTEXT)) {
			return element[CONTEXT];
		} else {
			if (element.parentNode) {
				return contextFromEvent(undefined, element.parentNode);
			}
		}
	}
	console.warn(
		event,
		`has no context. contextFromEvent for top level elements is not needed.`
	);
	return ``;
};

/**
contextFromArray joins paths to create a valid path to use with

d.variables[path]
d.elements[path]
 
@param {array} Array 

@return {string} path
*/
const contextFromArray = function (pathIn) {
	return pathIn.join(INSIDE_SYMBOL);
};

const enterObject = function (key) {
	pathIn.push(key);
};

const leaveObject = function () {
	pathIn.pop();
};


/**
getParentContext

@param {string} context 

@return {string} parentContext
*/
const getParentContext = function (context) {
	const split = context.split(INSIDE_SYMBOL);
	split.pop();
	return split.join(INSIDE_SYMBOL);
};

const contextFromArrayWith = function (pathIn, withWhat) {
	if (pathIn.length === 0) {
		return withWhat;
	}
	return `${contextFromArray(pathIn)}${INSIDE_SYMBOL}${withWhat}`;
};

const normalizeStartPath = function (startPath) {
	// this is because `a>b>c` is irregular
	// `a>b>c>` or `>a>b>c` would not need such normalization
	if (startPath) {
		return `${startPath}${INSIDE_SYMBOL}`;
	}
	return startPath;
};

const deleteAllStartsWith = function (object, prefix) {
	Object.keys(object).forEach(function (key) {
		if (key.startsWith(prefix)) {
			delete object[key];
		}
	});
};

/**
removes a path and all its child from the dom99 singleton memory

Removing a DOM element with .remove() or .innerHTML = `` will NOT delete
	all the element references if you used the underlying nodes in dom99
	A removed element will continue receive invisible automatic updates
	it also takes space in the memory.

	And all of this doesn't matter for 1-100 elements, but it does matter,
	for an infinitely growing list
	
@param {string} path
*/
const forgetContext = function (path) {
	deleteAllStartsWith(variableSubscribers, path);
	deleteAllStartsWith(listSubscribers, path);
	deleteAllStartsWith(variables, path);
	deleteAllStartsWith(elements, path);
};

const notifyOneVariableSubscriber = function (variableSubscriber, value) {
	variableSubscriber[variableSubscriber[ELEMENT_PROPERTY]] = value;
};

const notifyVariableSubscribers = function (subscribers, value) {
	if (value === undefined) {
		// undefined can be used to use the default value
		// without explicit if else
		return;
	}
	subscribers.forEach(function (variableSubscriber) {
		notifyOneVariableSubscriber(variableSubscriber, value);
	});
};

const removeNode = function (node) {
	node.remove();
};

const notifyOneListSubscriber = function (listContainer, startPath, data) {
	const fragment = document.createDocumentFragment();
	if (
		hasOwnProperty.call(listContainer, CUSTOM_ELEMENT) &&
		hasOwnProperty.call(templateFromName, listContainer[CUSTOM_ELEMENT])
	) {
		// composing with custom element
		const template = templateFromName[listContainer[CUSTOM_ELEMENT]];
		const previous = copyArrayShallow(pathIn);
		pathIn = startPath.split(INSIDE_SYMBOL);
		const normalizedPath = normalizeStartPath(startPath);
		const newLength = data.length;
		let oldLength;
		let pathInside;
		if (hasOwnProperty.call(listContainer, LIST_CHILDREN)) {
			// remove nodes and variable subscribers that are not used
			oldLength = listContainer[LIST_CHILDREN].length;
			if (oldLength > newLength) {
				let i;
				for (i = newLength; i < oldLength; i += 1) {
					pathInside = `${normalizedPath}${i}`;
					listContainer[LIST_CHILDREN][i].forEach(removeNode);
					forgetContext(pathInside);
				}
				listContainer[LIST_CHILDREN].length = newLength;
			}
		} else {
			listContainer[LIST_CHILDREN] = [];
			oldLength = 0;
		}

		data.forEach(function (dataInside, i) {
			pathInside = `${normalizedPath}${i}`;
			feed(pathInside, dataInside);
			if (i >= oldLength) {
				// cannot remove document fragment after insert because they empty themselves
				// have to freeze the children to still have a reference
				const activatedClone = activateCloneTemplate(
					template,
					String(i)
				);
				listContainer[LIST_CHILDREN].push(
					freezeLiveCollection(activatedClone.childNodes)
				);
				fragment.appendChild(activatedClone);
			}
			// else reusing, feed updated with new data the old nodes
		});
		pathIn = previous;
	} else {
		listContainer.innerHTML = ``;
		data.forEach(function (value) {
			const listItem = document.createElement(listContainer[ELEMENT_LIST_ITEM]);
			if (isObjectOrArray(value)) {
				Object.assign(listItem, value);
			} else {
				listItem[listContainer[LIST_ITEM_PROPERTY]] = value;
			}
			fragment.appendChild(listItem);
		});
	}
	listContainer.appendChild(fragment);
};

const notifyListSubscribers = function (subscribers, startPath, data) {
	subscribers.forEach(function (listContainer) {
		notifyOneListSubscriber(listContainer, startPath, data);
	});
};


/**
Feed data, for element with corresponding data-variable and data-list

@param {string} startPath
@param {any} data

@or

@param {any} data

@return {Element} startElement
*/
const feed = function (startPath, data) {
	if (data === undefined) {
		data = startPath;
		startPath = ``;
	}
	if (isObjectOrArray(startPath)) {
		console.error(
			`Incorrect types passed to d.feed,
			d.feed(string, object) or d.feed(object)`
		);
	}
	if (!alreadyHooked) {
		feedHook(startPath, data);
	}
	if (!isObjectOrArray(data)) {
		variables[startPath] = data;
		if (hasOwnProperty.call(variableSubscribers, startPath)) {
			notifyVariableSubscribers(variableSubscribers[startPath], data);
		}
	} else if (Array.isArray(data)) {
		variables[startPath] = data;
		if (hasOwnProperty.call(listSubscribers, startPath)) {
			notifyListSubscribers(listSubscribers[startPath], startPath, data);
		}
	} else {
		const normalizedPath = normalizeStartPath(startPath);
		alreadyHooked = true;
		Object.entries(data).forEach(function ([key, value]) {
			const path = `${normalizedPath}${key}`;
			feed(path, value);
		});
		alreadyHooked = false;
	}
};

const applyFunctionOriginal = function (element, eventName, functionName) {
	if (!functions[functionName]) {
		console.error(`Event listener ${functionName} not found.`);
	}
	addEventListener(element, eventName, functions[functionName]);
	// todo only add context when not top level ? (inside sommething)
	element[CONTEXT] = contextFromArray(pathIn);
};

let applyFunction = applyFunctionOriginal;

const applyFunctions = function (element, attributeValue) {
	attributeValue.split(options.listSeparator).forEach(
		function (attributeValueSplit) {
			const tokens = attributeValueSplit.split(options.tokenSeparator);
			let functionName;
			let eventName;
			if (tokens.length === 1) {
				functionName = tokens[0];
				eventName = options.eventNameFromElement(element);
			} else {
				[eventName, functionName] = tokens;
			}
			applyFunction(element, eventName, functionName);
		}
	);
};

const applylist = function (element, attributeValue) {
	const [
		variableName,
		listItemTagName,
		optional
	] = attributeValue.split(options.tokenSeparator);

	let fullName = `-`;

	if (!variableName) {
		console.error(
			element,
			`Use ${options.directives.list}="variableName-tagName" format!`
		);
	}

	if (optional) {
		// for custom elements
		fullName = `${listItemTagName}-${optional}`;
		element[CUSTOM_ELEMENT] = fullName;
	} else {
		element[LIST_ITEM_PROPERTY] = options.propertyFromElement(
			listItemTagName.toUpperCase()
		);
		element[ELEMENT_LIST_ITEM] = listItemTagName;
	}

	// could send path as array directly
	// but have to change notifyOneListSubscriber to take in path as Array or String
	// before
	const path = contextFromArrayWith(pathIn, variableName);

	pushOrCreateArrayAt(listSubscribers, path, element);

	if (hasOwnProperty.call(variables, path)) {
		notifyOneListSubscriber(element, path, variables[path]);
	}
};

const applyVariable = function (element, variableName) {
	/* two-way bind
	example : called for <input data-variable="a">
	in this example the variableName = `a`
	we push the <input data-variable="a" > element in the array
	that holds all elements which share this same `a` variable
	undefined assignment are ignored, instead use empty string*/

	if (!variableName) {
		console.error(
			element,
			`Use ${options.directives.variable}="variableName" format!`
		);
	}

	element[ELEMENT_PROPERTY] = options.propertyFromElement(element);
	const path = contextFromArrayWith(pathIn, variableName);
	pushOrCreateArrayAt(variableSubscribers, path, element);
	const lastValue = variables[path]; // has latest
	if (lastValue !== undefined) {
		notifyOneVariableSubscriber(element, lastValue);
	}

	if (options.tagNamesForUserInput.includes(element.tagName)) {
		const broadcastValue = function (event) {
			//wil call setter to broadcast the value
			const value = event.target[event.target[ELEMENT_PROPERTY]];
			variables[path] = value;
			feedHook(path, value);
			// would notify everything including itself
			// notifyVariableSubscribers(variableSubscribers[path], value);
			variableSubscribers[path].forEach(function (variableSubscriber) {
				if (variableSubscriber !== element) {
					notifyOneVariableSubscriber(variableSubscriber, value);
				}
			});
		};
		addEventListener(
			element,
			options.eventNameFromElement(element),
			broadcastValue
		);
	}
};

const applyDirectiveElement = function (element, attributeValue) {
	/* stores element for direct access !*/
	const elementName = attributeValue;

	if (!elementName) {
		console.error(
			element,
			`Use ${options.directives.element}="elementName" format!`
		);
	}
	const path = contextFromArrayWith(pathIn, elementName);
	elements[path] = element;
};

const applytemplate = function (element, attributeValue) {
	/* stores a template element for later reuse !*/
	if (!attributeValue) {
		console.error(
			element,
			`Use ${options.directives.template}="d-name" format!`
		);
	}

	templateFromName[attributeValue] = element;
};

const activateCloneTemplate = function (template, key) {
	/* clones a template and activates it
	*/
	enterObject(key);
	const activatedClone = cloneTemplate(template);
	activate(activatedClone);
	cloneHook();
	leaveObject();
	return activatedClone;
};

const applyInside = function (element, key) {
	/* looks for an html template to render
	also calls applyDirectiveElement with key!*/
	if (!key) {
		console.error(
			element,
			`Use ${options.directives.inside}="insidewhat" format!`
		);
	}

	const template = templateFromName[
		customElementNameFromElement(element)
	];

	if (template) {
		const activatedClone = activateCloneTemplate(template, key);
		element.appendChild(activatedClone);
	} else {
		 // avoid infinite loop
		element.setAttribute(
			options.directives.inside,
			options.doneSymbol + key
		);
		 // parse children under name space (encapsulation of variable names)
		enterObject(key);
		activate(element);
		leaveObject();
	}
};

/**
Removes a template from the DOM and from dom99 memory  
@param {string} name

*/
const deleteTemplate = function (name) {
	if (!hasOwnProperty.call(templateFromName, name)) {
		console.error(
			`<template ${options.directives.template}=${name}>
			</template> not found or already deleted and removed.`
		);
	}
	templateFromName[name].remove();
	delete templateFromName[name];
};

const tryApplyDirectives = function (element) {
	/* looks if the element has dom99 specific attributes and tries to handle it*/
	// todo make sure no impact-full read write
	if (!element.hasAttribute) {
		// can this if be removed eventually ? --> no
		return;
	}

	// spellcheck atributes
	const directives = Object.values(options.directives);
	Array.prototype.slice.call(element.attributes).forEach(function (attribute) {
		if (attribute.nodeName.startsWith(`data`)) {
			if (directives.includes(attribute.nodeName)) ; else {
				console.warn(`dom99 does not recognize ${attribute.nodeName}`);
			}
		}
	});

	directivePairs.forEach(function ([directiveName, applyDirective]) {
		if (!element.hasAttribute(directiveName)) {
			return;
		}
		const attributeValue = element.getAttribute(directiveName);
		if (attributeValue[0] === options.doneSymbol) {
			return;
		}
		applyDirective(element, attributeValue);
		// ensure the directive is only applied once
		element.setAttribute(
			directiveName,
			`${options.doneSymbol}${attributeValue}`
		);
	});
	if (
		element.hasAttribute(options.directives.inside) ||
		element.hasAttribute(options.directives.list)
	) {
		return;
	}
	/*using a custom element without data-inside*/
	let customName = customElementNameFromElement(element);
	if (hasOwnProperty.call(templateFromName, customName)) {
		element.appendChild(
			cloneTemplate(templateFromName[customName])
		);
	}
};

/**
Activates the DOM by reading data- attributes, starting from startElement
and walking inside its tree

@param {Element} startElement

@return {Element} startElement
*/
const activate = function (startElement = document.body) {
	//build array only once and use up to date options, they should not reset twice
	if (!directivePairs) {
		directivePairs = [
			/*order is relevant applyVariable being before applyFunction,
			we can use the just changed live variable in the bind function*/
			[options.directives.element, applyDirectiveElement],
			[options.directives.variable, applyVariable],
			[options.directives.function, applyFunctions],
			[options.directives.list, applylist],
			[options.directives.inside, applyInside],
			[options.directives.template, applytemplate]
		];
	}
	elementsDeepForEach(startElement, tryApplyDirectives);
	return startElement;
};

/**
Convenience function for activate, feed and assigning functions from
an object

@param {object} dataFunctions
@param {object} initialFeed
@param {Element} startElement
@param {function} callBack

@return {any} callBack return value
*/
const start = function (
	dataFunctions = {},
	initialFeed = {},
	startElement = document.body,
	callBack = undefined
) {

	Object.assign(functions, dataFunctions);
	feed(initialFeed);
	activate(startElement);
	if (!callBack) {
		return;
	}
	return callBack();
};


const originalFeedHook = function () {

};
let feedHook = originalFeedHook;

/**
Plug in a plugin (hook) into the core functionality

@param {object} featureToPlugIn

*/
const plugin = function (featureToPlugIn) {
	if (!isObjectOrArray(featureToPlugIn)) {
		console.error(`plugin({
			type,
			plugin
		});`);
	}
	if (featureToPlugIn.type === `function`) {
		functionPlugins.push(featureToPlugIn.plugin);
		if (applyFunction !== applyFunctionOriginal) {
			return;
		}
		applyFunction = function (element, eventName, functionName) {
			let defaultPrevented = false;
			const preventDefault = function () {
				defaultPrevented = true;
			};
			functionPlugins.forEach(function (pluginFunction) {
				pluginFunction(element, eventName, functionName, functions, preventDefault);
			});
			if (defaultPrevented) {
				return;
			}
			applyFunctionOriginal(element, eventName, functionName);
		};
	} else if (featureToPlugIn.type === `variable`) {
		feedPlugins.push(featureToPlugIn.plugin);
		if (feedHook !== originalFeedHook) {
			return;
		}
		feedHook = function (startPath, data) {
			feedPlugins.forEach(function (feedPlugin) {
				feedPlugin(startPath, data);
			});
		};
	} else if (featureToPlugIn.type === `cloned`) {
		clonePlugins.push(featureToPlugIn.plugin);
		
		cloneHook = function () {
			const context = contextFromArray(pathIn);
			clonePlugins.forEach(function (clonePlugin) {
				clonePlugin(context);
			});
		};
	} else {
		console.warn(`plugin type ${featureToPlugIn.type} not yet implemented`);
	}
};

const dom99core = Object.freeze({
	start,
	activate,
	elements,
	functions,
	variables,
	feed,
	forgetContext,
	deleteTemplate,
	contextFromArray,
	contextFromEvent,
	getParentContext,
});

exports.d = dom99core;
exports.plugin = plugin;
exports.options = options;
exports.createElement2 = createElement2;
exports.idGenerator = idGenerator;
