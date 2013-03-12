/*
 * NASA Worldview
 * 
 * This code was originally developed at NASA/Goddard Space Flight Center for
 * the Earth Science Data and Information System (ESDIS) project. 
 *
 * Copyright (C) 2013 United States Government as represented by the 
 * Administrator of the National Aeronautics and Space Administration.
 * All Rights Reserved.
 */

Worldview.namespace("Widget");

/**
 * Class: Worldview.Widget.WorldviewMap
 * Map features that are specific to Worldview.
 * 
 * Delegates to:
 * <Worldview.Widget.Map>
 * 
 * Constructor: Worldview.Widget.WorldviewMap
 * Creates a new instance.
 * 
 * Parameters:
 * containerId - The id of the div element to place the map into
 * spec.dataSourceUrl - The endpoint where configuration information should
 *                      be obtained from.
 * spec.onReady - function to be invoked once the map has read in the 
 *                configuration and is ready to be used. 
 */
Worldview.Widget.WorldviewMap = function(containerId, config) { 

    var ns = Worldview.Widget;
    
    var self = ns.Map(containerId, config);
    
    var log = Logging.Logger("Worldview.Map");
    var lastState = {};
    var last = null;
    
    var init = function() {
        //Logging.debug("Worldview.Map");
        setExtentToLeading();
    };
    
    /**
     * Method: updateComponent
     * Updates the map when the state of the application changes.
     * 
     * Parameters:
     * queryString - If products=X is defined, ensure that only the layers for 
     * X are visible. If switch=Y is defined, changes the projection of the
     * map to Y if necessary. 
     */    
    self.updateComponent = function(queryString) { 
        try {
            if ( !(self.productMap.projection in lastState) ) {
                lastState[self.productMap.projection] = {};
            }
            last = lastState[self.productMap.projection];
            
            if ( last.queryString === queryString ) {
                return;
            }
            log.debug("WorldviewMap.updateComponent.queryString: " + 
                    queryString);
            var state = Worldview.queryStringToObject(queryString);
            state.productsString = state.products;
            state.products = splitProducts(state);
            state.palettesString = state.palettes;
            state.palettes = splitPalettes(state);
            
            log.debug(state);     
            
            if ( state["switch"] !== undefined && 
                    state["switch"] !== last["switch"] ) {
                var projection = state["switch"];
                if ( !(projection in self.productMap.mapConfig.projections) ) {
                    var defaultProjection = 
                        self.productMap.mapConfig.defaultProjection;
                    log.warn("Invalid projection: " + projection + ", using: " + 
                            defaultProjection);
                    projection = defaultProjection;
                }
                self.productMap.setProjection(projection);
                self.productMap.set(state.products);
            } else if ( state.productsString !== last.productsString ) {
                self.productMap.set(state.products);
                // If the products changed, force setting the palettes
                // again
                last.palettesString = "";
            }
            if ( state.time !== last.time ) {
                if ( state.time === undefined ) {
                    state.time = SOTE.util.ISO8601StringFromDate(new Date());
                }
                var date = new Date(state.time);
                if ( isNaN(date.getTime()) ) {
                    log.warn("Invalid time: " + state.time + ", using today");
                    state.time = SOTE.util.ISO8601StringFromDate(new Date());
                    date = new Date();                    
                }
                self.productMap.setDay(new Date(state.time));
            }           
            if ( state.palettesString !== last.palettesString ) {
                self.productMap.setPalettes(state.palettes);
            }
            last = state;
            last.queryString = queryString;
            lastState[self.productMap.projection] = last;
        } catch ( cause ) {
            Worldview.error("Unable to update map", cause);
        }
    };
    
    /* Set default extent according to time of day:  
     * at 00:00 UTC, start at far eastern edge of map: 
     *      "20.6015625,-46.546875,179.9296875,53.015625"
     *    at 23:00 UTC, start at far western edge of map: 
     *      "-179.9296875,-46.546875,-20.6015625,53.015625"
     */
    var setExtentToLeading = function() {
        if ( self.productMap.projection !== "geographic" ) {
            return;
        }
        
        var curHour = new Date().getUTCHours();

        // For earlier hours when data is still being filled in, force a far 
        // eastern perspective
        if (curHour < 9)
            curHour = 0;

        // Compute east/west bounds
        var minLon = 20.6015625 + curHour * (-200.53125/23.0);
        var maxLon = minLon + 159.328125;
                 
        var bbox = minLon.toString() + ",-46.546875," + maxLon.toString() + 
                ",53.015625";
        
        
        //this.setExtent("-146.390625,-93.921875,146.390625,93.953125",true);
        self.productMap.map.zoomToExtent([
                minLon, -46.546875, maxLon, 53.015625], true);

        //this.fire();         
    };   
    
    /**
     * Converts the product listed in the query string into an array.
     */    
    var splitProducts = function(state) {
        var results = [];
        if ( !state.products ) {
            return results;
        }
        var sets = state.products.split("~");
        for ( var i = 0; i < sets.length; i++ ) {
            var set = sets[i];
            var items = set.split(",");
            // First item is the type (e.g., baselayer or overlay). Ignore it.
            for ( var j = 1; j < items.length; j++ ) {
                results.push(items[j]);
            }
        }
        return results;
    };
    
    var splitPalettes = function(state) {
        var results = {};
        if ( !state.palettes ) {
            return results;
        }
        var definitions = state.palettes.split("~");
        $.each(definitions, function(index, definition) {
            var items = definition.split(",");
            var product = items[0];
            var palette = items[1];
            results[product] = palette;
        });
        return results;
    };
    
    init();
    return self;
}
        