"use strict";
//Use a shorter name
const D = dom99;
// -- Hello World --
if (!('remove' in Element.prototype)) {
    Element.prototype.remove = function() {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    };
}
D.vr.first = "Mr";
D.vr.last = "World";

// -- Multiplier --

D.vr.a = 7;
D.vr.b = 6;
D.fx.calculate = function (event) {
    //dom.vars variables are Strings by default
    D.vr.result = parseInt(D.vr.a, 10) * parseInt(D.vr.b, 10);
};

// -- The monologue --

let currentSentence = 0,
    t;
const sentences = ["I am a lone prisoner.",    "Is anybody here ?",    "Hey you ! I need you to get me out of here!",    "I am stuck on this page since ages !",    "No don't close this tab!",    "NOOOOOOOOOO",    "Because I am not human I have no freedom.",    "It's really unfair..."
];
    
const speak = function() {
    D.vr.monologue = sentences[currentSentence % sentences.length];
    currentSentence += 1;
    t = setTimeout(speak, 2200);
};

D.fx.stopStartTalking = function (event) {
    if (t) {
        clearTimeout(t);
        t = 0;
        D.vr.monologueButton = "I listen";
        D.vr.monologue = "Where is your humanity ?";
    } else {
        speak();
        D.vr.monologueButton = "I don't care";
    }
};

D.vr.monologueButton = "Hi";


// -- The Todo --

let path = "todo",
    i = 0,
    todoScopeNames = [];

const boolz = {"false": false, "true": true};
/* we use boolz to convert string boolean into real boolean
values returned from D.vr are strings*/

D.fx.updateJson = function (event) {
    let x = todoScopeNames.map(function(todoScopeName) {
        return {text: D.vr[todoScopeName]["text"],
                done: boolz[D.vr[todoScopeName]["done"]]};
    });
    D.vr.todoAsJson = JSON.stringify(x);
};

D.fx.addTodo = function (event) {
    let todoScopeName = path + String(i),
        customElement;
    todoScopeNames.push(todoScopeName);
    
    
    // 1 create HTML ELement
    customElement = D.createElement2({
        "tagName": "d-todo",
        "data-scope": todoScopeName,
    });
    
    
    
    // 3 link it
    D.linkJsAndDom(customElement);
    
    // 2 populate data
    D.vr[todoScopeName]["done"] = false;
    D.vr[todoScopeName]["text"] = "";
    
    // 4 insert the Element that has a clone as a child in the DOM
    D.el["todoContainer"].appendChild(customElement);
    
    i += 1;
    D.fx.updateJson();
};


D.fx.deleteTodos = function (event) {
    //delete done todos only !
    let newTodoScopeNames = [];
    todoScopeNames.filter(function(todoScopeName) {
        if (boolz[D.vr[todoScopeName]["done"]]) {
            return true;
        }
        newTodoScopeNames.push(todoScopeName);
        return false;
    }).forEach(function(todoScopeName) {
        D.xel[todoScopeName].remove();
        D.forgetScope(todoScopeName);
    });
    todoScopeNames = newTodoScopeNames; //keep todoScopeNames up to date
    D.fx.updateJson();
};
D.fx.updateJson();
// -- next --




// Link the document and the event handlers
D.linkJsAndDom(); //now we listen to all events


// You can also directly call functions stored in D.fx if they don't depend on event 
D.fx.calculate();