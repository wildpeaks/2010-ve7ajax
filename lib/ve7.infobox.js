/**
 * @file Infoboxes support for Bing Maps AJAX Control 7.0
 * @see http://msdn.microsoft.com/en-us/library/gg427610.aspx
 * Requires jQuery 1.4.2+
 */

/*********************************************************************************************/
//(function(){


// Minimum CSS required to support infoboxes
jQuery('head').append('<style>.VE_Pushpin_Popup{position: absolute; z-index: 1000; display: none;}</style>');


/*********************************************************************************************/

/**
 * Public method to switch visibility of a Pushpin's infobox.
 */
Microsoft.Maps.Pushpin.prototype.ToggleInfoBox = function(speed){
	if (this.GetInfoboxShown()) this.HideInfobox(speed);
	else this.ShowInfobox(speed);
};


/**
 * Public method to show a Pushpin's infobox.
 */
Microsoft.Maps.Pushpin.prototype.ShowInfobox = function(speed){
	speed = speed || 'fast';
	if (this._infoboxWrapper){
		var pos = this.tryLocationToPixel(
			this._location,
			Microsoft.Maps.PixelReference.control
		);
		this._infoboxWrapper
		 .css('left', pos.x + 'px')
		 .css('top', pos.y + 'px')
		 .stop(true, true)
		 .fadeIn(speed);
	}
	this._infoboxShown = true;
};


/**
 * Public method to hide a Pushpin's infobox.
 */
Microsoft.Maps.Pushpin.prototype.HideInfobox = function(speed){
	speed = speed || 'fast';
	if (this._infoboxWrapper){
		this._infoboxWrapper
		 .stop(true, true)
		 .fadeOut(speed);
	}
	this._infoboxShown = false;
};


/*********************************************************************************************/

/**
 * Public functions to read the extended options the same way native options are read.
 */

Microsoft.Maps.Pushpin.prototype.GetTitle = function(){
	return this._title;
};
Microsoft.Maps.Pushpin.prototype.GetDescription = function(){
	return this._description;
};
Microsoft.Maps.Pushpin.prototype.GetSticky = function(){
	return this._sticky;
};
Microsoft.Maps.Pushpin.prototype.GetInfobox = function(){
	return this._infobox;
};
Microsoft.Maps.Pushpin.prototype.GetInfoboxShown = function(){
	return this._infoboxShown;
};

/*********************************************************************************************/

/**
 * Extended version of the public method "Pushpin.setOptions" that supports the additional options.
 */
Microsoft.Maps.Pushpin.prototype._setOptions = Microsoft.Maps.Pushpin.prototype.setOptions;
Microsoft.Maps.Pushpin.prototype.setOptions = function(options){
	// Extended options
	var changed = false;
	for (var option in options){
		switch(option){
			case 'title':
			case 'description':
			case 'sticky':
			case 'infobox':
				changed = true;
				this['_' + option] = options[option];
			break;
		}
	}
	if (changed) Microsoft.Maps.Events.invoke(this, 'entitychanged', {entity: this});

	// Native options
	this._setOptions(options);
};


/*********************************************************************************************/
/* Pushpin-level event handlers  */

/**
 * Pushpin icon events
 */

Microsoft.Maps.Pushpin.prototype._mouseover = function(e){
	var entity = e.target;
	if (entity) entity.ShowInfobox();
};

Microsoft.Maps.Pushpin.prototype._mouseout = function(e){
	var entity = e.target;
	if (entity && !entity._sticky && !entity._autosticky) entity.HideInfobox();
};

Microsoft.Maps.Pushpin.prototype._click = function(e){
	var entity = e.target;
	if (entity){
		if (entity.GetInfoboxShown()){
			if (!entity._autosticky){
				entity._autosticky = true;
			} else {
				entity._autosticky = false;
				entity.HideInfobox();
			}
		} else {
			entity._autosticky = true;
			entity.ShowInfobox();
		}
	}
};


/*********************************************************************************************/
/* EntityCollection-level event handlers  */


/**
 * Called when an entity is added to the map.
 */
Microsoft.Maps.EntityCollection.prototype._entityAdded = function(e){
	var entity = e.entity;
	if (entity instanceof Microsoft.Maps.Pushpin){
		var collection = e.collection;

		entity._infoboxShown = false;
		entity._autosticky = false;
		entity.tryLocationToPixel = collection._tryLocationToPixel;

		// Wrapper
		if (entity._infoboxWrapper){
			entity._infoboxWrapper.empty();
			entity._infoboxWrapper.remove();
		}
		entity._infoboxWrapper = jQuery('<div class="VE_Pushpin_Popup"></div>');
		collection._rootElement.append( entity._infoboxWrapper );

		// Events
		Microsoft.Maps.Events.addHandler(entity, 'mouseover', entity._mouseover);
		Microsoft.Maps.Events.addHandler(entity, 'mouseout', entity._mouseout);
		Microsoft.Maps.Events.addHandler(entity, 'click', entity._click);
		Microsoft.Maps.Events.addHandler(entity, 'touchstart', entity._click);
		//Microsoft.Maps.Events.addHandler(entity, 'dragstart', entity._dragstart);
		//Microsoft.Maps.Events.addHandler(entity, 'dragend', entity._dragend);

		// Set contents depending on the options
		collection._entityChanged(e);
	}
};


/**
 * Called when the options of an entity changed.
 */
Microsoft.Maps.EntityCollection.prototype._entityChanged = function(e){
	var entity = e.entity;
	if (entity instanceof Microsoft.Maps.Pushpin){

		if (entity._infobox){

			if (entity._infoboxCustom){
				entity._infoboxWrapper.empty();
			}
			if (entity._infoboxTitle){
				entity._infoboxTitle.remove();
				entity._infoboxTitle = false;
			}
			if (entity._infoboxDescription){
				entity._infoboxDescription.remove();
				entity._infoboxDescription = false;
			}

			entity._infoboxCustom = true;
			entity._infoboxWrapper.append( entity._infobox );	

		} else {

			if (entity._infoboxCustom){
				entity._infoboxWrapper.empty();
				entity._infoboxCustom = false;
			}
			
			if (entity._infoboxTitle){
				entity._infoboxTitle.html(entity._title);
			} else {
				entity._infoboxTitle = jQuery('<div class="Title">' + entity._title + '</div>');
				entity._infoboxWrapper.append( entity._infoboxTitle );	
			}

			if (entity._infoboxDescription){
				entity._infoboxDescription.html(entity._description);
			} else {
				entity._infoboxDescription = jQuery('<div class="Description">' + entity._description + '</div>');
				entity._infoboxWrapper.append( entity._infoboxDescription );	
			}

		}

	}
}


/**
 * Called when an entity is removed from the map.
 */
Microsoft.Maps.EntityCollection.prototype._entityRemoved = function(e){
	var entity = e.entity;
	if (entity instanceof Microsoft.Maps.Pushpin){

		// Delete the wrapper and its contents
		entity.tryLocationToPixel = null;
		if (entity._infoboxWrapper){
			entity._infoboxWrapper.empty();
			entity._infoboxWrapper.remove();
			entity._infoboxWrapper = null;
		}

		// Events
		Microsoft.Maps.Events.removeHandler(entity, 'mouseover', entity._mouseover);
		Microsoft.Maps.Events.removeHandler(entity, 'mouseout', entity._mouseout);
		Microsoft.Maps.Events.removeHandler(entity, 'click', entity._click);
		Microsoft.Maps.Events.removeHandler(entity, 'touchstart', entity._click);
		//Microsoft.Maps.Events.removeHandler(entity, 'dragstart', entity._dragstart);
		//Microsoft.Maps.Events.removeHandler(entity, 'dragend', entity._dragend);

	}
};


/*********************************************************************************************/
/* Map-level event handlers  */

/** 
 * Moving the map closes every infobox, even sticky ones (that way the map isn't obscured 
 * by sticky infoboxes, so the user sees what he's doing).
 */
Microsoft.Maps.Map.prototype._viewchangestart = function(){
	var viewreopen = this.target._viewreopen;
	var entities = this.target.entities;
	var l = entities.getLength();
	for (var i = 0; i < l; i++){
		var entity = entities.get(i);
		if ((entity instanceof Microsoft.Maps.Pushpin) && entity.GetInfoboxShown()){
			if (entity._sticky || entity._autosticky) viewreopen.push(entity);
			entity.HideInfobox(1);
		}
	}
}

/** 
 * Once the map stops moving, it re-opens sticky infoboxes that were open.
 */
Microsoft.Maps.Map.prototype._viewchangeend = function(){
	var viewreopen = this.target._viewreopen;
	var l = viewreopen.getLength();
	for (var i = 0; i < l; i++){
		viewreopen.pop().ShowInfobox();
	}
}

/*********************************************************************************************/

/**
 * Extended "Map" constructor to listen to collection changes and view changes.
 */
Microsoft.Maps._Map = Microsoft.Maps.Map;
Microsoft.Maps.Map = function(container, options){
	var map = new Microsoft.Maps._Map(container, options);

	// Sticky infoboxes that were open when the map starts changing of view
	// and that should be re-open when the view change ends.
	map._viewreopen = new Microsoft.Maps.EntityCollection();
	
	// For the EntityCollection events to be able to access some Map properties
	// (because you can't assume there will be only one Map in the page).
	map.entities._tryLocationToPixel = map.tryLocationToPixel;
	map.entities._rootElement = jQuery( map.getRootElement() );

	// Entities collection events
	Microsoft.Maps.Events.addHandler(map.entities, 'entityadded', map.entities._entityAdded);
	Microsoft.Maps.Events.addHandler(map.entities, 'entitychanged', map.entities._entityChanged);
	Microsoft.Maps.Events.addHandler(map.entities, 'entityremoved', map.entities._entityRemoved);

	// Map movements (closes non-sticky infoboxes)
	Microsoft.Maps.Events.addHandler(map, 'viewchangestart', map._viewchangestart);
	Microsoft.Maps.Events.addHandler(map, 'viewchangeend', map._viewchangeend);

	return map;
};

/*********************************************************************************************/

	
//})();