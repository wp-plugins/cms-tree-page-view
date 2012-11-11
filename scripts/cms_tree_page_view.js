
// @todo: add prefix to treeOptions, div_actions
var cms_tpv_tree, treeOptions, div_actions, cms_tpv_current_li_id = null;
jQuery(function($) {
	
	// Globals, don't "var" them! :)
	cms_tpv_tree = $("div.cms_tpv_container");
	div_actions = $("div.cms_tpv_page_actions");

	// try to override css
	var height = "20", height2 = "18", ins_height = "18";
	css_string = '' + 
		'.jstree ul, .jstree li { display:block; margin:0 0 0 0; padding:0 0 0 0; list-style-type:none; } ' + 
		'.jstree li { display:block; min-height:'+height+'px; line-height:'+height+'px; white-space:nowrap; margin-left:18px; min-width:18px; } ' + 
		'.jstree-rtl li { margin-left:0; margin-right:18px; } ' + 
		'.jstree > ul > li { margin-left:0px; } ' + 
		'.jstree-rtl > ul > li { margin-right:0px; } ' + 
		'.jstree ins { display:inline-block; text-decoration:none; width:18px; height:'+height+'px; margin:0 0 0 0; padding:0; } ' + 
		'.jstree a { display:inline-block; line-height:'+height2+'px; height:'+height2+'px; color:black; white-space:nowrap; text-decoration:none; padding:1px 2px; margin:0; } ' + 
		'.jstree a:focus { outline: none; } ' + 
		'.jstree a > ins { height:'+ins_height+'px; width:16px; } ' + 
		'.jstree a > .jstree-icon { margin-right:3px; } ' + 
		'.jstree-rtl a > .jstree-icon { margin-left:3px; margin-right:0; } ' + 
		'li.jstree-open > ul { display:block; } ' + 
		'li.jstree-closed > ul { display:none; } ';
	$.vakata.css.add_sheet({
		str : css_string,
		title : "jstree_cms_tpv"
	});

	treeOptions = {
		plugins: ["themes","json_data","cookies","search","dnd", "types"],
		core: {
			"html_titles": true
		},
		"json_data": {
			"ajax": {
				"url": ajaxurl + CMS_TPV_AJAXURL + CMS_TPV_VIEW,
				// this function is executed in the instance's scope (this refers to the tree instance)
				// the parameter is the node being loaded (may be -1, 0, or undefined when loading the root nodes)
				"data" : function (n) {
					// the result is fed to the AJAX request `data` option
					if (n.data) {
						var post_id = n.data("post_id");
						return {
							"id": post_id
						};
					}
				}

			}

		},
		"themes": {
			"theme": "wordpress",
			"dots": false
		},
		"search": {
			"ajax" : {
				"url": ajaxurl + CMS_TPV_AJAXURL + CMS_TPV_VIEW
			},
			"case_insensitive": true
		},
		"dnd": {
		}
	};

	if (cms_tpv_tree.length > 0) {
		cms_tpv_bind_clean_node(); // don't remember why I run this here.. :/
	}
	cms_tpv_tree.each(function(i, elm) {

		var $elm = $(elm);

		// init tree, with settings specific for each post type
		var treeOptionsTmp = jQuery.extend(true, {}, treeOptions); // make copy of object
		var post_type = cms_tpv_get_post_type(elm);
		treeOptionsTmp.json_data.ajax.url = treeOptionsTmp.json_data.ajax.url + "&post_type=" + post_type + "&lang=" + cms_tpv_get_wpml_selected_lang(elm);
		treeOptionsTmp.json_data.data = cms_tpv_jsondata[post_type]; // get from js
		
		var isHierarchical = $(elm).closest(".cms_tpv_wrapper").find("[name=cms_tpv_meta_post_type_hierarchical]").val();
		if (isHierarchical == 0) {
			// no move to children if not hierarchical
			treeOptionsTmp.types = {
				"types": {
					"default" : {
						"valid_children" : [ "none" ]
					}
				}
			};
		}
		
		$elm.bind("search.jstree", function (event, data) {
			if (data.rslt.nodes.length === 0) {
				// no hits. doh.
				$(this).closest(".cms_tpv_wrapper").find(".cms_tree_view_search_form_no_hits").fadeIn("fast");
			}
		});
		
		$elm.bind("loaded.jstree", cms_tpv_tree_loaded);
		$elm.jstree(treeOptionsTmp);

	});

}); // end ondomready


/**
 * When tree is loaded: start hoverindenting stuff
 * @todo: this is fireded several times, why not only once
 */
function cms_tpv_tree_loaded(event, data) {

	// console.log("loaded");

	var $target = jQuery(event.target);
	var $lis = $target.find("li a");
	var $hoverIntentWrap = $target.find("div.cmstpv-hoverIntent-wrap");

	// Bind hoverIntent
	$hoverIntentWrap.hoverIntent({    
		over: cms_tpv_mouseover,
		out: cms_tpv_mouseout,
		timeout: 500, // default 0, 500 is good
		sensitivity: 4 // default 7
	});

	function cms_tpv_mouseover(e) {
		var $this = jQuery(this);
		var $li = $this.closest("li");
		cms_tpv_mouseover_li(e, $li.get(0));
	}

	function cms_tpv_mouseout(e) {
		var $this = jQuery(this);
		var $li = $this.closest("li");
		cms_tpv_mouseout_li(e, $li.get(0));
	}

}


// get post type
// elm must be within .cms_tpv_wrapper to work
function cms_tpv_get_post_type(elm) {
	return jQuery(elm).closest("div.cms_tpv_wrapper").find("[name=cms_tpv_meta_post_type]").val();
}
// get selected lang
function cms_tpv_get_wpml_selected_lang(elm) {
	return jQuery(elm).closest("div.cms_tpv_wrapper").find("[name=cms_tpv_meta_wpml_language]").val();
}

function cms_tpv_get_page_actions_div(elm) {
	return jQuery(elm).closest("div.cms_tpv_wrapper").find("div.cms_tpv_page_actions");
}
function cms_tpv_get_wrapper(elm) {
	var $wrapper = jQuery(elm).closest("div.cms_tpv_wrapper");
	return $wrapper;
}


// Click on link to add page after the current page
jQuery(document).on("click", "a.cms_tpv_action_add_page_after", function(e) {

	var $this = jQuery(this);
	var post_type = cms_tpv_get_post_type(this);
	var selected_lang = cms_tpv_get_wpml_selected_lang(this);

	var post_status = $this.closest("li").data("post_status");

	// not allowed when status is trash
	if (post_status == "trash") {
		jAlert(cmstpv_l10n.Can_not_add_page_after_when_status_is_trash);
		return false;
	}

	jPrompt(cmstpv_l10n.Enter_title_of_new_page, "", "CMS Tree Page View", function(new_page_title) {
		if (new_page_title) {
			var pageID = $this.parents("li:first").attr("id");
			jQuery(".cms_tpv_message").html("<p>"+cmstpv_l10n.Adding_page+"</p>").slideDown("fast");
			jQuery.post(ajaxurl, {
				"action": "cms_tpv_add_page",
				"pageID": pageID,
				"type": "after",
				"page_title": new_page_title,
				"post_type": post_type,
				"wpml_lang": selected_lang
			}, function(data, textStatus) {
				document.location = data;
			});
		}
	});

	return false;
});

// Click on link to add page insde another page
jQuery(document).on("click", "a.cms_tpv_action_add_page_inside", function(e) {
	var $this = jQuery(this);
	var post_type = cms_tpv_get_post_type(this);
	var selected_lang = cms_tpv_get_wpml_selected_lang(this);
	
	var post_status = $this.closest("li").data("post_status");

	// check page status, because we cant add a page inside a page with status draft or status trash
	// if we edit the page wordpress will forget the parent
	//$li.data("jstree").permalink;
	//var post_status = li.data("jstree").post_status;
	if (post_status == "draft") {
		jAlert(cmstpv_l10n.Can_not_add_sub_page_when_status_is_draft);
		return false;
	}

	// not allowed when status is trash
	if (post_status == "trash") {
		jAlert(cmstpv_l10n.Can_not_add_sub_page_when_status_is_trash);
		return false;
	}
	
	jPrompt(cmstpv_l10n.Enter_title_of_new_page, "", "CMS Tree Page View", function(new_page_title) {
		if (new_page_title) {
			var pageID = $this.parents("li:first").attr("id");
			jQuery(".cms_tpv_message").html("<p>" + cmstpv_l10n.Adding_page + "</p>").slideDown("fast");
			jQuery.post(ajaxurl, {
				"action": "cms_tpv_add_page",
				"pageID": pageID,
				"type": "inside",
				"page_title": new_page_title,
				"post_type": post_type,
				"wpml_lang": selected_lang
			}, function(data, textStatus) {
				document.location = data;
			});
		}
	});
	return false;
});



// check if tree is beging dragged
function cms_tpv_is_dragging() {
	var eDrag = jQuery("#vakata-dragged");
	return eDrag.is(":visible");
}

/*
jQuery(".jstree li").live("mouseover", function(e) {
	var $li = jQuery(this);
	var li_id = $li.attr("id");
	cms_tpv_mouseover_li(this);
});
// ..and hide them again
jQuery(".jstree li").live("mouseout", function() {
	//cms_tpv_current_li_id = null;
	//console.log("out");
	cms_tpv_mouseout_li(this);
});
*/



// fired when mouse is over li
function cms_tpv_mouseover_li(e, li) {

	var $li = jQuery(li);

	var div_actions_for_post_type = cms_tpv_get_page_actions_div(li);
	var $cms_tpv_container = $li.closest("div.cms_tpv_container");

	if (cms_tpv_is_dragging() == false) {
		
		var is_visible = div_actions_for_post_type.is(":visible");
		is_visible = false;

		if (is_visible) {
			// do nada
		} else {

			// Remove classes on all elements
			$cms_tpv_container.find("li.has-visible-actions").removeClass("has-visible-actions");
			$cms_tpv_container.find("a.hover").removeClass("hover");

			// Add classes to only our new
			$li.addClass("has-visible-actions");
			$cms_tpv_container.addClass("has-visible-actions");
			$li.find("a:first").addClass("hover");
			
			// setup link for view page
			$view = div_actions_for_post_type.find(".cms_tpv_action_view");
			var permalink = $li.data("permalink");
			$view.attr("href", permalink);

			// setup link for edit page
			$edit = div_actions_for_post_type.find(".cms_tpv_action_edit");
			var editlink = $li.data("editlink");
			$edit.attr("href", editlink);

			// ..and some extras
			div_actions_for_post_type.find(".cms_tpv_page_actions_modified_time").text($li.data("modified_time"));
			div_actions_for_post_type.find(".cms_tpv_page_actions_modified_by").text($li.data("modified_author"));
			div_actions_for_post_type.find(".cms_tpv_page_actions_page_id").text($li.data("post_id"));		
			
			div_actions_for_post_type.find(".cms_tpv_page_actions_columns").html( unescape($li.data("columns")) );

			// add post title as headline
			div_actions_for_post_type.find(".cms_tpv_page_actions_headline").html( $li.data("post_title") );
			
			// position and show action div
			// put it inside cmstpv-hoverIntent-wrap so hoverIndent is cool with it
			var $overIntentWrap = $li.find("div.cmstpv-hoverIntent-wrap:first");
			//console.log( $overIntentWrap.length );
			var $a = $li.find("a");
			var width = $a.outerWidth(true);
			//$li.append(div_actions_for_post_type);
			
			$overIntentWrap.append(div_actions_for_post_type);
			
			var new_offset = div_actions_for_post_type.offset();
			var new_offset_left = e.pageX + 35;
			// check that new left offset is not to close to the left of the a
			// i.e. the mouse be x px more than the a for the experience to be optimal IMHO
			var diff = e.pageX - $a.offset().left;
			if (diff < 25) new_offset_left = new_offset_left + 25;

			new_offset.left = new_offset_left;
			new_offset.top = $a.offset().top - 30;
			div_actions_for_post_type.offset(new_offset);
			
			// check if user is allowed to edit page
			var $cms_tpv_action_add_and_edit_page = div_actions_for_post_type.find(".cms_tpv_action_add_and_edit_page");
			if ($li.data("user_can_edit_page") == 0) {
				// nooope
				$edit.hide();
				$cms_tpv_action_add_and_edit_page.hide();
			} else {
				//$edit.show();
				$cms_tpv_action_add_and_edit_page.show();
				div_actions_for_post_type.addClass("cms_tpv_page_actions_visible");
			}
			

		}
	}

}

// When mouse leaves the whole cms tree page view-area/div
jQuery(document).on("mouseleave", "div.cms_tpv_container", function(e) {
	// hide actions div after moving mouse out of a page and not moving it on again for...a while
	
	//var div_actions_for_post_type = cms_tpv_get_page_actions_div(li);
	//var $cms_tpv_container = $li.closest("div.cms_tpv_container");
	// console.log("mouse outside container");
	var $container = jQuery(this);
	jQuery.data(this, "cmstpv_do_hide_after_timeout", true);
	var t = this;

	setTimeout(function() {
		//(function() {
			
			// check if container has data value that still tells us to hide
			// this value is reseted when we enter the div again
			//$cms_tpv_container
			//console.log("timeout passed; hide?");
			//console.log( jQuery.data(t, "cmstpv_do_hide_after_timeout") );
			if (jQuery.data(t, "cmstpv_do_hide_after_timeout")) {
				$container.find("li.has-visible-actions").removeClass("has-visible-actions");
				$container.find("a.hover").removeClass("hover");
				$container.find("div.cms_tpv_page_actions").removeClass("cms_tpv_page_actions_visible");
			}

		//})();
	}, 1000);

});

// When mouse enter the whole cms tree page view-area/div
jQuery(document).on("mouseenter", "div.cms_tpv_container", function(e) {

	// console.log("mouse inside container, reset hide data");
	var $container = jQuery(this);
	jQuery.data(this, "cmstpv_do_hide_after_timeout", false);

});


// fired when mouse leaves li
function cms_tpv_mouseout_li(e, li) {

	var $li = jQuery(li);
	var $cms_tpv_container = $li.closest("div.cms_tpv_container");

	/*
	var div_actions_for_post_type = cms_tpv_get_page_actions_div(li);
	var $cms_tpv_container = $li.closest("div.cms_tpv_container");
	var is_visible = div_actions_for_post_type.is(":visible");
	*/

	// Remove classes if we are not viewing any
	// This function can get called also when a new li has been hoverIndent:ed
	/*
	$li.find("a:first").removeClass("hover");
	$li.removeClass("has-visible-actions");
	if (!is_visible) {
		$cms_tpv_container.removeClass("has-visible-actions");
	}
	*/
	//div_actions.hide();
}


// hide action links on drag
jQuery.jstree.drag_start = function() {
	jQuery(".cms_tpv_action_view, .cms_tpv_action_edit, .cms_tpv_action_add_page, .cms_tpv_action_add_page_after, .cms_tpv_action_add_page_inside").hide();
}

/**
 * add childcount and other things to each li
 */
function cms_tpv_bind_clean_node() {
	
	cms_tpv_tree.bind("move_node.jstree", function (event, data) {
		var nodeBeingMoved = data.rslt.o; // noden vi flyttar
		var nodeNewParent = data.rslt.np;
		var nodePosition = data.rslt.p;
		var nodeR = data.rslt.r;
		var nodeRef = data.rslt.or; // noden som positionen gäller versus
		var selected_lang = cms_tpv_get_wpml_selected_lang(nodeBeingMoved);
		/*

		// om ovanför
		o ovanför or
		
		// om efter
		o efter r
		
		// om inside
		o ovanför or
		

		drop_target		: ".jstree-drop",
		drop_check		: function (data) { return true; },
		drop_finish		: $.noop,
		drag_target		: ".jstree-draggable",
		drag_finish		: $.noop,
		drag_check		: function (data) { return { after : false, before : false, inside : true }; }
		
		Gets executed after a valid drop, you get one parameter, which is as follows:
		data.o - the object being dragged
		data.r - the drop target
		*/
		
		if (nodePosition == "before") {
			var node_id = jQuery( nodeBeingMoved ).attr( "id" );
			ref_node_id = jQuery( nodeRef ).attr( "id" );
		} else if (nodePosition == "after") {
			var node_id = jQuery( nodeBeingMoved ).attr( "id" );
			ref_node_id = jQuery( nodeR ).attr( "id" );
		} else if (nodePosition == "inside") {
			var node_id = jQuery( nodeBeingMoved ).attr( "id" );
			ref_node_id = jQuery( nodeR ).attr( "id" );
		}
		
		// Update parent or menu order
		jQuery.post(ajaxurl, {
				action: "cms_tpv_move_page", 
				"node_id": node_id, 
				"ref_node_id": ref_node_id, 
				"type": nodePosition,
				"icl_post_language": selected_lang
			}, function(data, textStatus) {
		});

	});
	
	cms_tpv_tree.bind("clean_node.jstree", function(event, data) {
		var obj = (data.rslt.obj);
		if (obj && obj != -1) {
			obj.each(function(i, elm) {

				var li = jQuery(elm);
				var aFirst = li.find("a:first");

				// check that we haven't added our stuff already
				if (li.data("done_cms_tpv_clean_node")) {
					return;
				} else {
					li.data("done_cms_tpv_clean_node", true);
				}

				var childCount = li.data("childCount");
				if (childCount > 0) {
					aFirst.append("<span title='" + childCount + " " + cmstpv_l10n.child_pages + "' class='child_count'>("+childCount+")</span>");
				}
				
				// add protection type
				var rel = li.data("rel");
				if(rel == "password") {
					aFirst.find("ins").after("<span class='post_protected' title='" + cmstpv_l10n.Password_protected_page + "'>&nbsp;</span>");
				}

				// add page type
				var post_status = li.data("post_status");
				// post_status can be any value because of plugins like Edit flow
				// check if we have an existing translation for the string, otherwise use the post status directly
				var post_status_to_show = "";
				if (post_status_to_show = cmstpv_l10n["Status_"+post_status + "_ucase"]) {
					// it's ok
				} else {
					post_status_to_show = post_status;
				}
				if (post_status != "publish") {
					aFirst.find("ins").first().after("<span class='post_type post_type_"+post_status+"'>" + post_status_to_show + "</span>");
				}

				// To make hoverindent work we must wrap something around the a bla bla bla

				//li.find()
				var div_wrap = jQuery("<div class='cmstpv-hoverIntent-wrap' />");
				div_wrap.css({
					"display": "inline-block",
					"xwidth": "100%"
				});
				aFirst.wrap(div_wrap);


			});
		}
	});
}

// Perform search when submiting form
jQuery(document).on("submit", "form.cms_tree_view_search_form", function(e) {
	
	var $wrapper = jQuery(this).closest(".cms_tpv_wrapper");
	$wrapper.find(".cms_tpv_search_no_hits").hide();
	var s = $wrapper.find(".cms_tree_view_search").attr("value");
	s = jQuery.trim( s );

	if (s) {
		$wrapper.find(".cms_tree_view_search_form_no_hits").fadeOut("fast");
		$wrapper.find(".cms_tree_view_search_form_working").fadeIn("fast");
		$wrapper.find(".cms_tree_view_search_form_reset")
		$wrapper.find(".cms_tpv_container").jstree("search", s);
		$wrapper.find(".cms_tree_view_search_form_reset").fadeIn("fast");
	} else {
		$wrapper.find(".cms_tree_view_search_form_no_hits").fadeOut("fast");
		$wrapper.find(".cms_tpv_container").jstree("clear_search");
		$wrapper.find(".cms_tree_view_search_form_reset").fadeOut("fast");
	}
	$wrapper.find(".cms_tree_view_search_form_working").fadeOut("fast");
	
	return false;

});

// Reset search when click on x-link
jQuery(document).on("click", "a.cms_tree_view_search_form_reset", function(e) {
	var $wrapper = jQuery(this).closest(".cms_tpv_wrapper");
	$wrapper.find(".cms_tree_view_search").val("");
	$wrapper.find(".cms_tpv_container").jstree("clear_search");
	$wrapper.find(".cms_tree_view_search_form_reset").fadeOut("fast");
	$wrapper.find(".cms_tree_view_search_form_no_hits").fadeOut("fast");
	return false;
});

// open/close links
jQuery(document).on("click", "a.cms_tpv_open_all", function(e) {
	var $wrapper = jQuery(this).closest(".cms_tpv_wrapper");
	$wrapper.find(".cms_tpv_container").jstree("open_all");
	return false;
});

jQuery(document).on("click", "a.cms_tpv_close_all", function(e) {
	var $wrapper = jQuery(this).closest(".cms_tpv_wrapper");
	$wrapper.find(".cms_tpv_container").jstree("close_all");
	return false;
});

// view all or public or trash
jQuery(document).on("click", "a.cms_tvp_view_all", function(e) {
	cms_tvp_set_view("all", this);
	return false;
});

jQuery(document).on("click", "a.cms_tvp_view_public", function(e) {
	cms_tvp_set_view("public", this);
	return false;
});

jQuery(document).on("click", "a.cms_tvp_view_trash", function() {
	cms_tvp_set_view("trash", this);
	return false;
});


// change lang
jQuery(document).on("click", "a.cms_tvp_switch_lang", function(e) {
	$wrapper = cms_tpv_get_wrapper(this);
	$wrapper.find("ul.cms_tvp_switch_langs a").removeClass("current");
	jQuery(this).addClass("current");

	var re = /cms_tpv_switch_language_code_([\w-]+)/;
	var matches = re.exec( jQuery(this).attr("class") );
	var lang_code = matches[1];
	$wrapper.find("[name=cms_tpv_meta_wpml_language]").val(lang_code);

	var current_view = cms_tpv_get_current_view(this);
	cms_tvp_set_view(current_view, this);
	
	return false;

});

function cms_tpv_get_current_view(elm) {
	
	$wrapper = cms_tpv_get_wrapper(elm);
	
	if ($wrapper.find(".cms_tvp_view_all").hasClass("current")) {
		return "all";
	} else if ($wrapper.find(".cms_tvp_view_public").hasClass("current")) {
		return "public";
	} else {
		return false; // like unknown
	}

}

function cms_tvp_set_view(view, elm) {

	var $wrapper = jQuery(elm).closest(".cms_tpv_wrapper");

	var div_actions_for_post_type = cms_tpv_get_page_actions_div(elm);
	$wrapper.append(div_actions_for_post_type);

	$wrapper.find(".cms_tvp_view_all, .cms_tvp_view_public, .cms_tvp_view_trash").removeClass("current");
	$wrapper.find(".cms_tpv_container").jstree("destroy").html("");
	cms_tpv_bind_clean_node();

	if (view == "all") {
		$wrapper.find(".cms_tvp_view_all").addClass("current");
	} else if (view == "public") {
		$wrapper.find(".cms_tvp_view_public").addClass("current");
	} else if (view == "trash") {
		$wrapper.find(".cms_tvp_view_trash").addClass("current");
	} else {
		
	}

	// Hide actions if open
	var $cms_tpv_container = $wrapper.find("div.cms_tpv_container");
	$cms_tpv_container.find("li.has-visible-actions").removeClass("has-visible-actions");
	$cms_tpv_container.find("a.hover").removeClass("hover");
	$cms_tpv_container.find("div.cms_tpv_page_actions").removeClass("cms_tpv_page_actions_visible");
	jQuery("div.cms_tpv_page_actions_visible").removeClass("cms_tpv_page_actions_visible");
	
	var treeOptionsTmp = jQuery.extend(true, {}, treeOptions);
	treeOptionsTmp.json_data.ajax.url = ajaxurl + CMS_TPV_AJAXURL + view + "&post_type=" + cms_tpv_get_post_type(elm) + "&lang=" + cms_tpv_get_wpml_selected_lang(elm);

	$wrapper.find(".cms_tpv_container").bind("loaded.jstree", cms_tpv_tree_loaded);
	$wrapper.find(".cms_tpv_container").jstree(treeOptionsTmp);

	/*
	__calback loaded jquery.jstree.js:238
	__calback reopen jquery.jstree.js:238
	__calback reload_nodes
	*/

}
