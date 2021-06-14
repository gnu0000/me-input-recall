//
// jquery recall plugin v1.1 - Craig Fitzgerald 07/2017, 01/2018
//
// Allows the user to use up and down arrows in text inputs to recall matching history
//  this somewhat works with textareas, but thats just a bonus
//
// keys:
//   up/down: recall previous matching entries
//   escape:  clear input
//   ctrl-x:  clear history,
//   ctrl-d:  dump to console
// options:
//   id:            id for load/save data (default is input's id)
//   maxLength:     max size of list to save (default: 50)
//   minSaveLength: min size of input to add to save list (default: 2)
//   matchCase:     case sensitive matches with history
//   matchAny:      match anywhere, not just at the beginning of the strings
//   matchAll:      just cycle through all history
//   tooltip:       show a tooltip popup when input has focus
//   tooltipText:   use this text for the tooltip instead of the default
//   data:          preload with this array of strings (default: null)
//   initData:      preload with this array only if no saved history
//   link:          selector of another input - use it's history
// examples:
//    $("input").recall();
//    $("#input1").recall({id:"foo", maxLength:50});
//    var data = "john,joe,steve,craig,bill,bob,beth,kerry,mary".split(",");
//    $("#input2").recall({data: data});
//    $("#input3").recall({link: "#input1"});
//    $("#input4").recall({tooltip: true});
//
// calling .recall additional times changes options/data
//    $("#in1").recall();
//    $("#in1").recall({clear: true});
//    $("#in1").recall({data:["aa","bb","cc"]});
//    $("#in1").recall({add: ["dd", "ee"]});
//    $("#in1").recall({matchCase:true});
//

(function($) {
   var History = function(element, options) {
      var self = this;

      this.Init = function() {
         self.InitData();
         self.InitEvents();
      };

      this.InitData = function() {
         self.input      = $(element);
         self.recallData = [];
         self.pos        = 0;
         self.original   = null;
         self.tooltip    = null;
         self.options    = $.extend({
            id           : self.input.attr("name") || self.input.attr("id") || "",
            maxLength    : 50, 
            minSaveLength: 2,
            matchCase    : false,
            matchAny     : false,
            matchAll     : false,
            tooltip      : false,
            tooltipText  : "Use up/down key to access history"
         }, options || {});

         if (self.options.tooltip) {
            self.CreateTooltip();
         }
         setTimeout(function() {self.Load()});
      };

      this.InitEvents = function() {
         self.input
            .keydown(self.HandleKey)
            .focus(self.HandleFocus)
            .blur(self.HandleBlur);
      };

      this.SetOptions = function(options) {
         options = options || {};
         var newData = options.data;
         self.options = $.extend(self.options, options);
         if (self.options.clear) {
            delete self.options.clear;
            self.recallData = [];
         }
         if (newData) {
            delete self.options.link;
            self.Load();
         }
         if (self.options.add) {
            $.each(self.options.add, function(){
               self.AddEntry(this);
            });
            delete self.options.add
         }
      }

      this.HandleKey = function(event) {
         if (self.options.debug) console.log("Key: " + event.which);
         if (event.which == 38) return self.HandleUpDown(event, true);  // up
         if (event.which == 40) return self.HandleUpDown(event, false); // down
         if (event.which == 27) self.HandleEscape(event);               // esc
         if (event.which == 68) self.HandleDump(event);                 // ctrl-d
         if (event.which == 88) self.HandleClear(event);                // ctrl-x
         self.pos = 0;
         self.original = null;
      }

      this.HandleUpDown = function(event, isUp) {
         event.preventDefault();
         self.original = self.original != null ? self.original 
                       : self.input.val().replace(/\n/g, "").trim();
         var mod = self.options.matchCase ? "" : "i";
         var any = self.options.matchAny  ? "" : "^";
         var rgx = new RegExp(any + self.original, mod);
         var len = self.recallData.length;
         for(var i=0; i<len; i++) {
            var entry = self.recallData[self.Inc(len, isUp)];
            if (self.options.matchAll || rgx.test(entry)){
               return self.input.val(entry).trigger("input");
            }
         }
      };

      this.Inc = function(len, isUp) {
         self.pos += isUp ? -1 : 1;
         if (self.pos < 0) self.pos = len-1;
         if (self.pos >= len) self.pos = 0;
         return self.pos;
      }

      this.HandleEscape = function() {
         self.input.val("");
      };

      this.HandleFocus = function() {
         if (self.tooltip)
            self.tooltip.show();
      };            

      this.HandleBlur = function() {
         var val = self.input.val();
         if (val.length >= self.options.minSaveLength)
            self.AddEntry(val);
         if (self.tooltip)
            self.tooltip.hide();
         setTimeout(function() {self.Save()});
      };

      this.AddEntry = function(val) {
         var rgx = new RegExp("^" + val + "$", "i");
         for(var i=0; i<self.recallData.length; i++) {
            if (rgx.test(self.recallData[i])) self.recallData.splice(i--, 1);
         }
         self.recallData.push(val);
      };

      this.HandleDump = function(event) {
         if (!event.ctrlKey) return;
         event.preventDefault();
         $.each(self.recallData, function(i) {
            console.log("["+i+"] " + this);
         });
      };

      this.HandleClear = function(event) {
         if (!event.ctrlKey) return;
         self.recallData = [];
      };

      this.CreateTooltip = function() {
         self.AddCSS();
         var pos = self.input.offset();
         pos.top += self.input.height() + 6;
         pos.left += self.input.width() - 250;

         self.tooltip = $("<div>").addClass("recall-tooltip").text(self.options.tooltipText);
         self.input.after(self.tooltip);
         self.tooltip.css(pos);
      };

      this.AddCSS = function() {
         if (!$("#recall-tooltip-css").length) {
            $("<style>" +
              ".recall-tooltip {" +
              "  position: absolute;" +
              "  width: 230px;" +
              "  padding: 15px;" +
              "  margin-top: 15px;" +
              "  background: #fefefe;" +
              "  border-radius: 10px;" +
              "  border: 1px solid #ddd;" +
              "  background-color: rgb(238,238,238);" +
              "  box-shadow: 3px 3px 3px #888888;" +
              "  z-index: 1000;" +
              "  display:none;}" +
              ".recall-tooltip:after {" +
              "  position: absolute;" +
              "  left: 75%;" +
              "  bottom: 100%;" +
              "  border-right: 12px solid transparent;" +
              "  border-bottom: 30px solid rgb(238,238,238);" +
              "  border-left: 12px solid transparent;" +
              "  content: '';}" +
              "</style>"
             ).attr("id", "recall-tooltip-css").appendTo('body');
         }
      }

      this.Load = function() {
         if (self.options.link) return self.recallData = $(self.options.link).data("recall-object").recallData;
         if (self.options.data) return self.recallData = self.options.data;
         var data = localStorage.getItem("recallData_" + self.options.id);
         if (data) return self.recallData = data.split("|||");
         if (self.options.initData) return self.recallData = self.options.initData;
         return self.recallData = [];
      };

      this.Save = function() {
         if (self.options.link) 
            return $(self.options.link).data("recall-object").Save();
         var extra = self.recallData.length - self.options.maxLength;
         if (extra > 0) self.recallData.splice(0, extra);
         if (self.options.data) return;
         var data = self.recallData.join("|||");
         localStorage.setItem("recallData_" + self.options.id, data);
      };

      this.Init();
   };

   jQuery.fn.recall = function(options) {
      return this.each(function() {
         var element = $(this);
         var obj = element.data("recall-object");
         if (obj) return obj.SetOptions(options);
         element.data("recall-object", new History(this, options));
      });
   };

})(jQuery);
