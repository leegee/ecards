/* Card.js */
var Global = Global || {};
Global.CardObj = null;
Global.CardObjContainer = null;

/** @expose */
var Card = Card || new Class({
	Implements: [Options],
	options: {
		container:				null,
		lineLengths: 			[],
		requiredLineLengthsPx:	[],
		selectListElement: 		null,
		selectListIndex: 		null,
		textInput:				null
	},
	element:		null,
	
	initialize: function(options){
		var self = this;
		this.setOptions(options);
		this.element = self.options.container;
		Global.CardObjContainer = self.options.container;
	},
	
	load: function(){
		var self = this;
		new Request.JSON({
			url: 	self.options.uri +'.js',
			method: 'get',
			onFailure: function(r){
				throw( 'Error getting images: '+r.responseText );
			},
			onSuccess: function( json, txt) {
				// console.log( json );
				Object.keys( json ).each(function(i){
					self.options[i] = json[i]	
				});
				self.options.requiredLineLengthsPx =  self.options.line_lengths;
				self.initElement();
			}
		}).send();
		return this;
	},
	
	dispose: function(){ this.options.container.set('html','') },
	
	toHtml: function(){ return this.element },
	
	getText: function(){
		return this.options.textInput.element.get('value')	
	},

	getTextElement: function(){
		return this.options.textInput.element;
	},
	
	initElement: function(){
		this.illustrationElement = new Element('img', {
			src:		this.options.uri,
			id: 		'illustration',
			styles:	{
				top: this.options.illustration_top_px +'px'
			}
		})
		this.element.adopt( this.illustrationElement );
		this.options.textInput = new Card.Text( this.options );
		this.element.adopt( this.options.textInput.toHtml() );
		this.options.textInput.replaceUserText();
		this.options.textInput.element.fireEvent('keyup');
	}
});

Card.Text = Card.Text || new Class({
	Implements: [Options],
	options: {
		container: 	null,
		requiredLineLengthsPx: null,
		userText:	null
	},
	oldValue:	null,
	running:		false,
	element:		null,
	spaceWidth: null,
	
	initialize: function(options){
		this.setOptions(options);
		var self = this;
		self.spaceWidth = self.getChrWidth(' ');
		
		this.element = new Element('textarea',{
			'class': 'card_text',
			styles: {
				fontSize: self.options.font_size_px + 'px',
				lineSpacing: (self.options.font_size_px+self.options.leading)+'px'
			},
			text: self.options.text || 'Type here',
			'events': {
				'focus': function() {
					if (self.element.value.contains('Type here')) self.element.value = '';
				},
				'keydown': function(el){
					self.oldValue = el.target.value;
				},
				'keyup': function(el) {
					if (self.oldValue != self.element.value && !self.running ){
						self.running = true;
						var caret = self.element.getCaretPosition();
						
						var caretAtEnd = caret == self.element.get('value').length;
						
						self.oldValue  = self.element.value;
						self.element.set(
							'value',
							self.flow( self.element.get('value') )
						);
						
						if (caretAtEnd) caret = self.element.get('value').length;
						self.element.setCaretPosition( caret );
						
						self.running = false;
					}
				}
			}
		});
	},

	toHtml: function(){ return this.element },
	
	replaceUserText: function(){
		if (this.options.userText)
			this.options.textInput.element.set('value', this.options.userText);
	},
	
	flow: function( unFlowedText ){
		var self = this;
		var rv = "";
		var line = {
			number: 1,
			content: '',
			width: 0
		};
		var finalSpace = false;

		unFlowedText = unFlowedText.replace(/\n/g, " ");
		unFlowedText = unFlowedText.replace(/\s+/g, " ");
		unFlowedText = unFlowedText.replace(/(\S+)\n(\S+)/g, function(str,pre,post){
			return pre+' '+post
		});
		unFlowedText = unFlowedText.replace(/(\s+)\n(\S+)/g, function(str,pre,post){
			return pre+post
		});
		unFlowedText = unFlowedText.replace(/(\S+)\n(\s+)/g, function(str,pre,post){
			return pre+post
		});

		if (unFlowedText.match(/\s$/)) finalSpace = true;
		var m;
		var re = new RegExp( /(\S+)(\s+)?/g );
		while (m = re.exec( unFlowedText )){
			var word = m[1];
			var space = m[2];

			var wordWidth = word==''? 0 : self.getChrWidth( word );
			line.newWidth = line.width + self.spaceWidth + wordWidth;
			
			// Doesn't fit?
			if (wordWidth){
				if ( line.newWidth > self.options.requiredLineLengthsPx[ line.number -1 ] ){
					// If there is space for a new line on card
					if (line.number <= self.options.requiredLineLengthsPx.length) {
						rv += line.content + "\n" + word;
						line.content = '';
						line.width   =  0;
						line.number ++;
					}
				}
				// Fits
				else {
					if (line.number <= self.options.requiredLineLengthsPx.length) {
						line.content += word;
						line.width = line.newWidth;
					}
				}
			}
			
			// Replace space unless word ended with newline:
			if (space 
				&& line.number <= self.options.requiredLineLengthsPx.length
			){
				var lf = space.match(/[\n\n\f]/g);
				if ( lf ) {
					rv += line.content + "\n";
					line.content = '';
					line.width   =  0;
					line.number += 1;
				}
				else {
					line.width += self.spaceWidth * space.length;
					line.content += space;
				}
			}
		} // whend

		// Just empty lines at the start
		var m = unFlowedText.match(/^(\s+)/);
		var initialSpace = m? m[1] : '';
		
		if (line.number <= self.options.requiredLineLengthsPx.length  && line.width > 0) 
			rv += line.content;
		
		return initialSpace + rv;
	},
	
	getChrWidth: function( chrs ){
		chrs = chrs.replace( /\s/g, '.');
		var el = new Element('div',{
			'class': 'text',
			styles: {
				fontSize: this.options.font_size_px+'px',
				position: 'absolute',
				left: 0,
				top: -1000
			}
		});
		el.set('html', chrs );
		document.body.adopt( el );
		var size = el.getDimensions(true);
		el.dispose();
		return size.width;
	}
});

/** @expose */
Card.Selector = Card.Selector || new Class({
	Implements: [Options],
	options: {
		indexUri: '/make/index.js',
		saveUri: '/cgi-bin/create-card.cgi',
		cardUriElement: null,
		selectCatElement: null,
		selectPicsElement: null,
		cardElement: null
	},
	
	initialize: function(options){
		var self = this;
		this.setOptions(options);
		
		new Request.JSON({
			url: self.options.indexUri,
			method: 'get',
			onFailure: function(r){
				throw( 'Error getting images: '+r.responseText );
			},
			onSuccess: function( json, txt) {
				// console.log( json );
				self.populate( json );
				self.setEvents();
				self.pageLoaded();
			}
		}).send();
	},
	
	populate: function(json){
		var self = this;
		self.json = json;
		var done = {};
		Object.keys(json).each( function(cat){
			if (typeof done[cat] === 'undefined'){
				done[cat] = true;
				self.options.selectCatElement.adopt(
					new Element('option', {
						text: cat,
						value: cat
					})
				);
			}
		});
	},
	
	pageLoaded: function( selectedIndex ){
		Global.CardObjContainer = this.options.cardElement;
		this.options.selectCatElement.fireEvent('change');
		
		Global.CardObj = new Card({
			uri: this.options.selectPicsElement.getChildren()[0].get('full'),
			container: this.options.cardElement
		});
		Global.CardObj.load();

		new Card.SelectColours({
			element: this.options.selectColoursElement
		});
		
		new Card.SelectFonts({
			element: this.options.selectFontsElement
		});
	},
	
	setEvents: function(){
		var self = this;
		this.options.selectCatElement.addEvent('change', function(e){
			self.options.selectPicsElement.set('html','');
			var els = new Card.CardSelection({ 
				cat: this.value,
				uris: self.json[ this.value ]
			});
			els.thumbs.each( function(i){
				self.options.selectPicsElement.adopt( i.toHtml() );
			});
		});
		
		this.options.saveElement.addEvent('click', function(e){
			var data = {
				font:				Global.CardObj.getTextElement().getStyle('font-family'),
				user_name:			'test',
				img_uri: 			Global.CardObj.options.uri,
				font_colour:			'black',
				text:				Global.CardObj.getText(),
				background_colour:	Global.CardObjContainer.getStyle('background-color')
			};
			new Request.JSON({
				url: 	self.options.saveUri,
				method: 'post',
				data:	{
					json: JSON.encode(data)
				},
				// Unavailable: contentType: 'application/json',
				onFailure: function(r){
					throw( 'Error getting images: '+r.responseText );
				},
				onSuccess: function( json, txt) {
					// console.log( json );
					// self.options.cardUriElement.set('value', json.uri );
					
					if (json.htmlUri){
						document.location.href = json.htmlUri;
						return;
					}
					
					var s = new Spinner( document.body, {
						img: {
							styles:{
								'background': 'url('+ json.uri +') no-repeat',
								width: json.width +'px',
								height: json.height +'px'
							}
						},
						message: 'Right-click and Save background image'
					});
					s.show();
					var p =  new Element('p', {
						'class': 'close'
					});
					p.adopt(
						new Element('a', {
							href: json.uri,
							text: ' View the image ',
							target: '_blank',
							styles: { 
								color: 'white', 
								'text-decoration': 'none'
							}
						})
					);
					p.adopt(
						new Element('span', {
							text: ' / ',
							styles: {
								color: 'gray'
							}
						})
					);
					p.adopt(
						new Element('span', {
							text: ' Back to the card maker ',
							events: {
								click: function(){
									s.hide();
									s.destroy();
								}
							}
						})
					);
					s.content.adopt( p );
				}
			}).send();
		});
	}
});

Card.CardSelection = Card.CardSelection || new Class({
	Implements: [Options],
	options: {
		cat: null,
		uris: null
	},
	thumbs:	[],
	
	initialize: function(options){
		var self = this;
		this.setOptions(options);
		this.options.uris.each( function(i){
			self.thumbs.push(
				new Card.Thumbnail({
					link:  Object.keys(i)[0],
					thumb: i[ Object.keys(i)[0] ]
				}) 
			);
		});
	}
});

Card.Thumbnail = Card.Thumbnail || new Class({
	Implements: [Options],
	options: {
		link: null,
		thumb: null
	},
	element:	 null,
	
	initialize: function(options){
		var self = this;
		this.setOptions(options);
		this.element = new Element('img',{
			full: self.options.link,
			src: self.options.thumb,
			events: {
				click: function(e){
					Global.CardObj.dispose();
					Global.CardObj = new Card({
						uri: self.options.link,
						container: Global.CardObjContainer,
						text: Global.CardObj.getText()
					});
					Global.CardObj.load();
					// reflow text now XXX TODO
				}
			}
		});
	},
	
	toHtml: function(){
		return this.element	
	}
});


Card.SelectColours = Card.SelectColours || new Class({
	Implements: [Options],
	options: {
		element: null,
		colours: [
		 	'D7D1F8', 'CEDEF4', 'B8E2EF', 'D0E6FF', 'C0F7FE', 'BEFEEB', 'CAFFD8', 'BDF4CB', 'C9DECB', 'CAFEB8', 'DFFFCA', 'FFFFC8', 'F7F9D0',
		 	
			'FFDFEF', 'FFECEC', 'FFECF5', 'FDF2FF', 'F1ECFF', 'EAF1FB', 'DBF0F7', 'CFFEF0',
			'E3FBE9', 'E7FFDF', 'FFFFE3'
			
		]
	},
	
	initialize: function(options){
		var self = this;
		this.setOptions(options);
		
		this.options.colours.each( function(i){
			self.options.element.adopt(
				new Card.SelectColours.Colour({ hex: i }).toHtml()
			);
		});
	}
});

Card.SelectColours.Colour = Card.SelectColours.Colour || new Class({
	Implements: [Options],
	options: {
		hex: null
	},
	element: null,
	
	initialize: function(options){
		var self = this;
		this.setOptions(options);
		this.element = new Element('div', {
			'class': 'colour',
			styles: {
				backgroundColor: '#'+this.options.hex
			},
			events: {
				click: function(e){
					Global.CardObjContainer.setStyle('background-color', '#'+self.options.hex);
					Global.CardObjContainer.setStyle('border-color', '#'+self.options.hex);
				}
			}
		});
	},
	
	toHtml: function(){ return this.element }
});









Card.SelectFonts = Card.SelectFonts || new Class({
	Implements: [Options],
	options: {
		element: null,
		fonts: ['asap', 'gothic', 'actionman', 'bearpaw', 'bloody']
	},
	
	initialize: function(options){
		var self = this;
		this.setOptions(options);
		
		this.options.fonts.forEach( function(i){
			self.options.element.adopt(
				new Card.SelectFonts.Font({
					name: i
				}).toHtml()
			);
		});
	}
});

Card.SelectFonts.Font = Card.SelectFonts.Font || new Class({
	Implements: [Options],
	options: {
		name: null
	},
	element: null,
	
	initialize: function(options){
		var self = this;
		this.setOptions(options);
		this.element = new Element('div', {
			html: 'Font',
			'class': 'fontChoice',
			styles: {
				'font-family': self.options.name
			},
			events: {
				click: function(e){
					Global.CardObj.getTextElement().setStyle(
						'font-family', self.options.name
					);
				}
			}
		});
	},
	
	toHtml: function(){ return this.element }
});

