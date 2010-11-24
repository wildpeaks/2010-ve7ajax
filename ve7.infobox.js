/**
 * @file Infoboxes support for Bing Maps AJAX Control 7.0
 * @see http://msdn.microsoft.com/en-us/library/gg427610.aspx
 * Requires jQuery 1.4.2+
 */

/*********************************************************************************************/

// Minimum CSS required to support infoboxes
$('head').append('<style>.VE_Pushpin_Popup{position: absolute; z-index: 1000; display: none;}</style>');


/**
 * Use this function to create Pushpins until it can use collection events.
 */
Microsoft.Maps.Map.prototype.AddPushpin = function(location, options){
	options._infobox = $('<div class="VE_Pushpin_Popup"></div>');
	
	var pin = new Microsoft.Maps.Pushpin(location, options);
	this.entities._tryLocationToPixel = this.tryLocationToPixel;
	this.entities.push(pin);
	
	var root = $( this.getRootElement() );
	root.append(pin._infobox);

	this._entityAdded({entity: pin, collection: this.entities}); // TODELETE: simulates the "entityAdded" event
	
	return pin;
}


/*********************************************************************************************/

Microsoft.Maps.Pushpin.prototype.ToggleInfoBox = function(){
	if (this._infoboxShown) this.HideInfoBox();
	else this.ShowInfoBox();
};
Microsoft.Maps.Pushpin.prototype.ShowInfoBox = function(){
	var pos = this.tryLocationToPixel(
		this._location,
		Microsoft.Maps.PixelReference.control
	);
	this._infobox
	 .css('left', pos.x + 'px')
	 .css('top', pos.y + 'px')
	 //.show(); //no transition
	 .fadeIn('fast'); //short transition
	this._infoboxShown = true;
};
Microsoft.Maps.Pushpin.prototype.HideInfoBox = function(){
	//this._infobox.hide(); //no transition
	this._infobox.fadeOut('fast'); //short transition
	this._infoboxShown = false;
};

/*********************************************************************************************/

Microsoft.Maps.Pushpin.prototype._infoboxShown = false;

Microsoft.Maps.Pushpin.prototype._infoboxToggle = function(e){
	e.target.ToggleInfoBox();
};

Microsoft.Maps.Pushpin.prototype._infoboxShow = function(e){
	e.target.ShowInfoBox();
};

Microsoft.Maps.Pushpin.prototype._infoboxHide = function(e){
	e.target.HideInfoBox();
};

/*********************************************************************************************/

/**
 * Called when an entity is added to the map.
 */
Microsoft.Maps.Map.prototype._entityAdded = function(e){
	var entity = e.entity;
	if (entity._infobox){
		entity.tryLocationToPixel = e.collection._tryLocationToPixel;
		if (entity.sticky){
			Microsoft.Maps.Events.addHandler(entity, 'click', entity._infoboxToggle);
			//Microsoft.Maps.Events.addHandler(entity, 'touch', entity._infoboxToggle);
		} else {
			Microsoft.Maps.Events.addHandler(entity, 'mouseover', entity._infoboxShow);
			Microsoft.Maps.Events.addHandler(entity, 'mouseout', entity._infoboxHide);
			//Microsoft.Maps.Events.addHandler(entity, 'touch', entity._infoboxToggle);
		}
	}
};

/**
 * Called when an entity is removed from the map.
 */
Microsoft.Maps.Map.prototype._entityRemoved = function(e){
	var entity = e.target;
	if (entity._infobox){
		entity.tryLocationToPixel = null;
		if (entity.sticky){
			Microsoft.Maps.Events.removeHandler(entity, 'click', this._infoboxToggle);
			//Microsoft.Maps.Events.removeHandler(entity, 'touch', this._infoboxToggle);
		} else {
			Microsoft.Maps.Events.removeHandler(entity, 'mouseover', this._infoboxShow);
			Microsoft.Maps.Events.removeHandler(entity, 'mouseout', this._infoboxHide);
			//Microsoft.Maps.Events.removeHandler(entity, 'touch', this._infoboxToggle);
		}
		entity._infobox.remove();
	}
};

/*********************************************************************************************/

/**
 * Generates contents of the infobox and copy the extended options to the Pushpin instance (also called by the constructor).
 * NPO: if some options are missing, should it overwrite as NULL or leave the value as-is ? For now, it overwrites.
 */
Microsoft.Maps.Pushpin.prototype._setOptions = Microsoft.Maps.Pushpin.prototype.setOptions;
Microsoft.Maps.Pushpin.prototype.setOptions = function(options){
	// Pushpin options
	this._setOptions(options);

	// Infobox options: overwrites as NULL properties that are not provided
	if (options.sticky) this.sticky = options.sticky;
	if (options.title) this.title = options.title;
	if (options.description) this.description = options.description;
	if (options._infobox) this._infobox = options._infobox;

	// Infobox contents
	if (!options.infobox){
		options.infobox = $('<div class="Title">' + this.title + '</div><div class="Description">' + this.description + '</div>');
	} else if (options.infobox && this.infobox && (options.infobox != this.infobox)){
		this._infobox.remove( this.infobox );
	}

	// Add-replace the contents inside the infobox wrapper of this specific pin
	this.infobox = options.infobox;
	this._infobox.append( this.infobox );
};

/*********************************************************************************************/

/** 
 * Moving the map should close any infobox that is open, even sticky ones (that way the transition is faster)
 */
Microsoft.Maps.Map.prototype._viewstart = function(){
	var viewreopen = this.target._viewreopen;
	var entities = this.target.entities;
	var l = entities.getLength();
	for (var i = 0; i < l; i++){
		var entity = entities.get(i);
		if (entity._infoboxShown){
			entity.HideInfoBox();
			if (entity.sticky) viewreopen.push(entity);
		}
	}
}

/** 
 * Once the map stops moving, reopen sticky infoboxes that were open
 */
Microsoft.Maps.Map.prototype._viewend = function(){
	var viewreopen = this.target._viewreopen;
	var l = viewreopen.getLength();
	for (var i = 0; i < l; i++){
		viewreopen.pop().ShowInfoBox();
	}
}

/*********************************************************************************************/

/**
 * Extended "Map" constructor to listen to collection changes and map movements.
 */
Microsoft.Maps._Map = Microsoft.Maps.Map;
Microsoft.Maps.Map = function(container, options){
	var map = new Microsoft.Maps._Map(container, options);
	
	// Sticky infoboxes that were open when the map starts changing of view
	// and that should be re-open when the view change ends.
	map._viewreopen = new Microsoft.Maps.EntityCollection();

	// Entities collection events
	Microsoft.Maps.Events.addHandler(map.entities, 'entityAdded', map._entityAdded);
	Microsoft.Maps.Events.addHandler(map.entities, 'entityRemoved', map._entityRemoved);
	//Microsoft.Maps.Events.addHandler(map.entities, 'entityChanged', map._entityChanged);

	// Map movement (closes non-sticky infoboxes)
	Microsoft.Maps.Events.addHandler(map, 'viewchangestart', map._viewstart);
	Microsoft.Maps.Events.addHandler(map, 'viewchangeend', map._viewend);
	
	// Drag events (because dragging a pin should also close/move its infobox)
	// ...

	return map;
};

/*********************************************************************************************/
