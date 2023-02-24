import './App.css';
import api from "./Api.js";
import React from 'react';

class App extends React.Component {
	constructor(props) {
		super(props);
		this.state = { loading: true };
	}
	componentDidMount() {
		let saved_state = {}
		console.log("loading local storage");
		if (typeof(Storage) !== "undefined") {
			if (window.localStorage.getItem('username') !== null) {
				saved_state = { ...saved_state, username: JSON.parse(localStorage.getItem('username')) };
			}
			if (window.localStorage.getItem('token') !== null) {
				saved_state = { ...saved_state, token: JSON.parse(localStorage.getItem('token')) };
			}
			if (window.localStorage.getItem('chats') !== null && localStorage.getItem('chats') !== "undefined") {
				let chats = new Map(Object.entries(JSON.parse(localStorage.getItem('chats'))));
				chats = stringToNumberKeys(chats);
				saved_state = { ...saved_state, chats: chats };
			}
			if (window.localStorage.getItem('messages') !== null && localStorage.getItem('messages') !== "undefined") {
				let messages = new Map(Object.entries(JSON.parse(localStorage.getItem('messages'))));
				messages = stringToNumberKeys(messages);
				saved_state = { ...saved_state, messages: messages };
			}
		} else {
			alert("Your browser does not support local storage!");
			console.log("browser does not support local storage!");
		}
		console.log("finished loading state");
		let saved_screen = "chats";
		api.token_valid(saved_state.token).then((token_valid) => {
			if (!token_valid) {
				console.log("invalid token:", saved_state.token);
				//saved_state = {};
				saved_screen = "sign in";
				this.setState({
					...saved_state,
					screen: saved_screen,
				}, () => {
					this.setState({ ...this.state, loading: false });
				});
			} else {
				this.url_action(saved_state.token).then(() => {
					this.setState({
						...saved_state,
						screen: saved_screen,
					}, () => {
						this.setState({ ...this.state, loading: false });
					});
				});
				api.subscribeEvents(saved_state.token, (message) => this.onReceivedMessage(message));
			}
		});
	}
	render() {
		if (this.state.loading === true) {
			return <header className="App-header">Loading...</header>
		}
		let content = null;
		if (this.state.screen === "chats") {
			content = <HomeScreen sortChats={() => this.sortChats()}addChat={(id, chat, callback) => this.addChat(id, chat, callback)} settings={() => this.settings()} chatScreen={(chat) => this.chatScreen(chat)} newChat={() => this.newChat()} getChats={() => this.state.chats} getMessages={() => this.state.messages} getToken={() => this.state.token}></HomeScreen>;
		} else if (this.state.screen === "new chat") {
			content = <NewChatScreen homeScreen={() => this.homeScreen()} getUsername={() => { return this.state.username; }} chatScreen={(chat) => this.chatScreen(chat)}></NewChatScreen>
		} else if (this.state.screen === "sign in") {
			content = <SignInScreen setUser={(token, username, callback) => { this.setState({ ...this.state, token: token, username: username }, callback); }} homeScreen={() => this.homeScreen()} onReceivedMessage={(message) => this.onReceivedMessage(message)}></SignInScreen>;
		} else if (this.state.screen === "chat") {
			content = <ChatScreen readMessage={(message) => this.readMessage(message)} addChat={(id, chat, callback) => {this.addChat(id, chat, callback)}} chatSettings={(chat) => {this.chatSettings(chat)}} homeScreen={() => this.homeScreen()} getChat={() => this.getChat()} getToken={() => this.state.token} getMessages={() => this.state.messages} getUsername={() => this.state.username}></ChatScreen>
		} else if (this.state.screen == "settings") {
			content = <SettingsScreen homeScreen={() => this.homeScreen()} getToken={() => this.state.token} getUsername={() => this.state.username}></SettingsScreen>
		} else if (this.state.screen == "chat settings") {
			content = <ChatSettingsScreen addChat={(id, chat, callback) => {this.addChat(id, chat, callback)}} getToken={() => this.state.token} chatScreen={(chat) => this.chatScreen(chat)} getChat={() => this.getChat()}></ChatSettingsScreen>
		}
		return (<div className="App">
			{content}
		</div>);
	}
	getChat() {
		return this.state.chats.get(this.state.active_chat);
	}
	readMessage(message) {
		if (this.state.chats[message.chat] !== undefined) {
			let messages = this.state.messages;
			for (var i = 0; i < messages[message.chat].length; i++) {
				if (messages.get(message.chat)[i].id === message.id) {
					if (messages.get(message.chat)[i].seen !== true) {
						console.log("matched read message");
						messages.get(message.chat)[i].seen = true;
						api.read_message(this.state.token, message);
					}
				}
			}
			this.setState({ ...this.state, messages: messages });
		}
	} 
	addChat(id, chat, callback) {
		let chats = this.state.chats;
		if (chats == undefined) {
			chats = new Map();
		}
		chats.set(id, chat);
		if (chat.server !== undefined) {
			chats.delete(id);
		}
		this.setState({ ...this.state, chats: chats}, callback);
	}
	chatSettings(chat) {
		let chats_copy = this.state.chats;
		chats_copy.set(chat.id, chat);
		let new_state = { ...this.state, chats: chats_copy, active_chat: chat.id };
		this.setState(new_state, () => {
			this.setState({ ...this.state, screen: "chat settings" });
		});
	}
	newChat() {
		this.setState({ ...this.state, screen: "new chat" });
	}

	homeScreen() {
		if ("Notification" in window) {
			Notification.requestPermission();
		} else {
			console.log("No notifications???");
		}
		this.url_action(this.state.token);
		this.setState({ ...this.state, screen: "chats" });
	}

	async url_action(token) {
		let actions = getQueryParams(window.location.href);
		if (actions.joinchat !== undefined) {
			await api.join_chat_link(actions.joinchat, token);
			window.history.pushState(null, "CMessenger", "/");
		}
	}

	settings() {
		this.setState({ ...this.state, screen: "settings" });
	}

	chatScreen(chat) {
		let chats_copy = this.state.chats;
		if (chats_copy == undefined) {
			chats_copy = new Map();
		}
		chats_copy.set(chat.id, chat);
		let messages_copy = this.state.messages;
		if (messages_copy == undefined) {
			messages_copy = new Map();
		}
		if (messages_copy.get(chat.id) === undefined) {
			messages_copy.set(chat.id, []);
		}
		let new_state = { ...this.state, chats: chats_copy, active_chat: chat.id, messages: messages_copy };
		this.setState(new_state, () => {
			this.setState({ ...this.state, screen: "chat" });
		});
	}

	onReceivedMessage(message) {
		let message_object = JSON.parse(message);
		console.log(message_object);
		let finish = () => {
			if (message_object.read !== undefined) {
				if (message_object.read.message.from !== this.state.username) {
					if (this.state.chats.get(message_object.read.message.chat) !== undefined) {
						let messages = this.state.messages;
						for (var i = 0; i < messages.get(message_object.read.message.chat).length; i++) {
							if (messages.get(message_object.read.message.chat)[i].id === message_object.read.message.id) {
								if (messages.get(message_object.read.message.chat)[i].read !== "Read" || message_object.read.status !== "Delivered") {
									messages.get(message_object.read.message.chat)[i].read = message_object.read.status;
								}
							}
						}
						this.setState({ ...this.state, messages: messages });
					}
				}
			} else if (message_object.message !== undefined) {
				api.received_message(this.state.token, message_object.message);
				if (message_object.message.from_user.username !== this.state.username) {
					api.get_user(message_object.message.from_user.username).then((user) => {
						spawnNotification(message_object.message.text, undefined, "Message from " + user.name);
					});
				}
				if (this.state.chats.get(message_object.message.chat) !== undefined) {
					let messages = this.state.messages;
					messages.get(message_object.message.chat).push(message_object.message);
					this.setState({ ...this.state, messages: messages });
				} else {
					api.get_chat(message_object.message.chat, this.state.token).then((chat) => {
						let chats_copy = this.state.chats;
						chats_copy.set(chat.id, chat);
						let messages_copy = this.state.messages;
						if (messages_copy.get(chat.id) === undefined) {
							messages_copy.set(chat.id, []);
						}
						messages_copy.get(chat.id).push(message_object.message);
						let new_state = { ...this.state, chats: chats_copy, active_chat: chat.id, messages: messages_copy };
						this.setState(new_state);
					});
				}
			} else if (message_object.banner !== undefined) {
				if (this.state.chats.get(message_object.banner.chat) !== undefined) {
					let messages = this.state.messages;
					messages.get(message_object.banner.chat).push(message_object);
					this.setState({ ...this.state, messages: messages });
				} else {
					api.get_chat(message_object.banner.chat, this.state.token).then((chat) => {
						let chats_copy = this.state.chats;
						chats_copy.set(chat.id, chat);
						let messages_copy = this.state.messages;
						if (messages_copy.get(chat.id) === undefined) {
							messages_copy.set(chat.id, []);
						}
						messages_copy.get(chat.id).push(message_object);
						let new_state = { ...this.state, chats: chats_copy, active_chat: chat.id, messages: messages_copy };
						this.setState(new_state);
					});
				}
			}
			this.sortChats();
		};
		if (this.state.chats === undefined) {
			this.setState({ ...this.state, chats: [] }, finish);
		} else {
			finish();
		}
	}

	sortChats() {
		if (this.state.chats == undefined || this.state.messages == undefined) {
			return;
		}
		let chats = this.state.chats;
		let messages = this.state.messages;
		for (let chatid of messages.keys()) {
			messages.set(chatid, messages.get(chatid).sort((a, b) => {
				if (a.timestamp != undefined && b.timestamp != undefined) {
					return a.timestamp-b.timestamp;
				}
				return 0;
			}));
		}
		chats = new Map([...chats.entries()].sort((a ,b) => {
			if (messages.get(a[0]) !== undefined && messages.get(b[0]) !== undefined) {
				if (messages.get(a[0]).length > 0 && messages.get(b[0]).length > 0) {
					let a_last = messages.get(a[0])[messages.get(a[0]).length-1];
					let b_last = messages.get(b[0])[messages.get(b[0]).length-1];
					if (a_last.timestamp != undefined && b_last.timestamp != undefined) {
						return b_last.timestamp-a_last.timestamp;
					} else {
						if (a_last.timestamp === undefined) {
							return 1;
						}
						if (b_last.timestamp === undefined) {
							return -1;
						}
					}
				}
			} else {
				if (messages.get(a[0]) === undefined) {
					return 1;
				}
				if (messages.get(b[0]) === undefined) {
					return -1;
				}
			}
		}));
		this.setState({...this.state, messages: messages, chats: chats});
	}

	componentDidUpdate() {
		if (typeof(Storage) !== "undefined") {
			if (this.state.loading === false && this.state.screen !== "sign in") {
				window.localStorage.setItem("username", JSON.stringify(this.state.username));
				window.localStorage.setItem("token", JSON.stringify(this.state.token));
				if (this.state.chats !== undefined) {
					window.localStorage.setItem("chats", JSON.stringify(Object.fromEntries(this.state.chats)));
				}
				if (this.state.messages !== undefined) {
					window.localStorage.setItem("messages", JSON.stringify(Object.fromEntries(this.state.messages)));
				}
			}
		}
	}
}

class SettingsScreen extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loading: true,
		};
	}

	async componentDidMount() {
		let user_profile = await api.get_user(this.props.getUsername());
		this.setState({ ...this.state, name: user_profile.name, color: user_profile.color }, () => {
			this.setState({ ...this.state, loading: false });
		});
	}

	render() {
		let content = [];
		if (!this.state.loading) {
			content.push(<h1 key="username">{"username: " + this.props.getUsername()}</h1>);
			content.push(
				<h1 key="display-input">Display Name:
					<br></br>
					<input className='StyledInput' id='settings_new_name' defaultValue={this.state.name}></input>
				</h1>);
			content.push(
				<h1 key="color-input">Chat Bubble Color: <input id="settings_new_color" type="color" defaultValue={this.state.color}></input></h1>
			);
			content.push(<button key="update-button" className='StyledButton' onClick={() => this.update(document.getElementById("settings_new_name").value, document.getElementById("settings_new_color").value)}>Update</button>);
		} else {
			content.push(<p key="loading">loading</p>);
		}
		if (this.state.error !== undefined) {
			content.push(<p className='ErrorText' key="error">{this.state.error}</p>);
		}
		if (this.state.success) {
			content.push(<p className='GreenText' key="success">Successfully updated user profile!</p>);
		}
		return (<div>
			<BackArrow onClick={() => this.props.homeScreen()}></BackArrow>
			<h1>Settings</h1>
			{content}
		</div>);
	}

	update(name, color) {
		if (name === "") {
			this.setState({ ...this.state, error: "Display Name is empty", success: false });
			return;
		}
		api.set_user_profile(this.props.getToken(), name, color).then(() => {
			this.setState({ ...this.state, success: true, error: undefined });
		});
	}
}

class HomeScreen extends React.Component {
	componentDidMount() {
		if (this.props.getChats() !== undefined) {
			for (let chatid of this.props.getChats().keys()) {
				api.get_chat(chatid, this.props.getToken()).then((chat) => {
					this.props.addChat(chatid, chat);
				});
			}
		}
		this.props.sortChats();
	}
	render() {
		let chats = [];
		if (this.props.getChats() !== undefined) {
			for (let chatid of this.props.getChats().keys()) {
				chats.push(<ChatPreview key={JSON.stringify(this.props.getChats().get(chatid))} chat={this.props.getChats().get(chatid)} messages={this.props.getMessages().get(chatid)} chatScreen={this.props.chatScreen}></ChatPreview>);
			}
		}
		return (<div>
			{chats}
			<NewChatButton onClick={() => { this.props.newChat() }}></NewChatButton>
			<SettingsButton onClick={() => { this.props.settings() }}></SettingsButton>
		</div>);
	}
}

class ChatPreview extends React.Component {
	render() {
		let message_preview = null;
		if (this.props.messages !== undefined) {
			if (this.props.messages[this.props.messages.length - 1] !== undefined) {
				if (this.props.messages[this.props.messages.length - 1].banner !== undefined) {
					message_preview = <p className='MessagePreviewBody'>{this.props.messages[this.props.messages.length - 1].banner.text}</p>;
				} else {
					message_preview = <p className='MessagePreviewBody'>{this.props.messages[this.props.messages.length - 1].from_user.username}: {this.props.messages[this.props.messages.length - 1].text}</p>;
				}
			}
		}
		return (<div onClick={() => (this.props.chatScreen(this.props.chat))} className="ChatPreview">
			<h1 className="MessagePreview">{this.props.chat.name}</h1>
			{message_preview}
		</div>);
	}
}

class ChatSettingsScreen extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			users: [],
			link: undefined,
		};
	}
	componentDidMount() {
		this.update_users();
	}
	update_users() {
		this.setState({...this.state, users: []}, () => {
			for (let i = 0; i < this.props.getChat().users.length; i++) {
				api.get_user(this.props.getChat().users[i].username).then((user) => {
					let users = this.state.users;
					users.push(<p key={user.username}>{user.name + " ("+user.username+")"}</p>);
					this.setState({...this.state, users: users});
				});
			}
		});
	}

	render() {
		let link = [];
		if (this.state.link !== undefined) {
			let link_text = encodeURI(window.location.origin+"/?joinchat="+this.state.link);
			link.push(<p key="link text" style={{fontSize: "20px"}}>{link_text}</p>);
			link.push(<button key="copy button" className='StyledButton' style={{fontSize: "20px", marginRight:"2px"}} onClick={() => {
				navigator.clipboard.writeText(link_text);
			}}>Copy</button>);
			link.push(<button key="share button" className='StyledButton' style={{fontSize: "20px", marginLeft:"2px"}} onClick={() => {
				if (navigator.share) {
					navigator.share({
						title: 'CMessenger Group Chat',
						url: link_text
					}).then(() => {
						console.log('Thanks for sharing!');
					})
						.catch(console.error);
				} else {
					navigator.clipboard.writeText(link_text);
				}
			}}>Share</button>);
		}
		return (<div>
			<BackArrow onClick={() => this.props.chatScreen(this.props.getChat())}></BackArrow>
			<h1>Chat Name: <br></br><input className='StyledInput' defaultValue={this.props.getChat().name} id="chat_settings_new_name_input"></input><button id="chat_settings_new_name_button" className='StyledButton' onClick={() => this.change_name()}>Update</button></h1>
			<h1>Users:</h1>
			<div>{this.state.users}</div>
			<button className='StyledButton' style={{fontSize: "20px"}} onClick={() => {this.get_link()}}>Create Link</button>
			{link}
			<p>Add User: <input id="chat_settings_add_user_input" className='StyledInput'></input><button id="chat_settings_add_user_button" className='StyledButton' onClick={() => this.add_users()}>Add</button></p>
		</div>);
	}

	async get_link() {
		if (this.state.link === undefined) {
			let link_id = await api.create_chat_link(this.props.getChat().id, this.props.getToken());
			this.setState({ ...this.state, link: link_id.join_code});
		}
	}

	change_name() {
		api.edit_chat(document.getElementById("chat_settings_new_name_input").value, [], this.props.getChat().admin, this.props.getChat().id, this.props.getToken());
	}

	add_users() {
		if (this.props.getChat().admin === undefined) {
			this.props.getChat().admin = {username: "chrissy"};
		}
		if (document.getElementById("chat_settings_add_user_input").value !== "" && !this.user_in_chat(document.getElementById("chat_settings_add_user_input").value)) {
			api.edit_chat(document.getElementById("chat_settings_new_name_input").value, [{username: document.getElementById("chat_settings_add_user_input").value}], this.props.getChat().admin, this.props.getChat().id, this.props.getToken()).then(() => {
				api.get_chat(this.props.getChat().id, this.props.getToken()).then((chat) => {
					this.props.addChat(this.props.getChat().id, chat, () => {
						this.update_users();
					});
				});
			});
		}
	}
	user_in_chat(username) {
		let users = Object.values(this.props.getChat().users);
		for (var i = 0; i < users.length; i++) {
			if (users[i].username === username) {
				return true;
			}
		}
		return false;
	}
}

class ChatScreen extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			message_input_ref: React.createRef(),
		};
	}
	componentDidMount() {
		api.get_chat(this.props.getChat().id, this.props.getToken()).then((chat) => {
			this.props.addChat(this.props.getChat().id, chat);
		});
		if (this.state.message_input_ref.current !== null) {
			this.state.message_input_ref.current.focus();
		}
	}

	render() {
		let messages = [];
		for (var i = 0; i < this.props.getMessages().get(this.props.getChat().id).length; i++) {
			let message = this.props.getMessages().get(this.props.getChat().id)[i];
			if (message.banner !== undefined) {
				messages.push(<Banner key={JSON.stringify(message)} text={message.banner.text}></Banner>);
			} else {
				let above = this.props.getMessages().get(this.props.getChat().id)[i - 1];
				if (above !== undefined && above.banner !== undefined) {
					above = undefined;
				}
				let below = this.props.getMessages().get(this.props.getChat().id)[i + 1];
				if (below !== undefined && below.banner !== undefined) {
					below = undefined;
				}
				messages.push(<Message readMessage={this.props.readMessage} above={above} below={below} index={i} messagesLength={this.props.getMessages().get(this.props.getChat().id).length} key={JSON.stringify(message)} message={message} getUsername={this.props.getUsername}></Message>);
			}
		}
		return (<div>
			<div style={{"zindex":1}}>
				<h1 className='AbsoluteTitle'>{this.props.getChat().name} </h1>
			</div>
			<div className='AllMessages' id="allMessages">{messages}</div>
			<MessageBox getToken={this.props.getToken} getChat={this.props.getChat} inputRef={this.state.message_input_ref}></MessageBox>
			<BackArrow onClick={() => this.props.homeScreen()}></BackArrow>
			<EditButton onClick={() => this.props.chatSettings(this.props.getChat())}></EditButton>
		</div>);
	}
}

class Banner extends React.Component {
	render() {
		return (<div className='Banner'>
			<p>{this.props.text}</p>
		</div>);
	}
}

class Message extends React.Component {
	constructor(props) {
		super(props);
		this.myRef = React.createRef();
		this.state = {
			loading: true,
			show_status: false,
			time: "",
		};
	}
	render() {
		let from_me = null;
		let username = this.props.message.from_user.username;
		let color = "#555";
		if (this.props.message.from_user.username === this.props.getUsername()) {
			from_me = "Me";
			username = "Me";
		} else {
			from_me = "Other";
		}
		if (!this.state.loading) {
			if (from_me !== "Me") {
				username = this.state.display_name;
			}
			color = this.state.color;
			if (from_me === "Other") {
				color = hexToRgb(color);
				color.r *= 0.7;
				color.g *= 0.7;
				color.b *= 0.7;
				color = "rgb("+color.r+","+color.g+","+color.b+")";
			}
		}
		let position = "";
		let show_bottom_info = false;
		if (this.props.messagesLength !== 1) {
			if (this.props.above === undefined || this.props.above.from_user.username !== this.props.message.from_user.username) {
				if (this.props.below !== undefined && this.props.below.from_user.username === this.props.message.from_user.username) {
					position = "Top";
				}
			} else if (this.props.below === undefined || this.props.below.from_user.username !== this.props.message.from_user.username) {
				if (this.props.above !== undefined && this.props.above.from_user.username === this.props.message.from_user.username) {
					position = "Bottom";
					show_bottom_info = true;
				}
			}
		}
		if (this.props.below === undefined) {
			show_bottom_info = true;
		}
		let status = undefined;
		let status_text = "Sent";
		if (this.props.message.read !== undefined) {
			status_text = this.props.message.read;
		}
		
		if ((show_bottom_info || this.state.show_status)) {
			status = <p className={'StatusText'+from_me}>{status_text + " " + this.state.time}</p>;
		}
		return (<div ref={this.myRef}>
			<div className={'Message' + from_me + position} style={{ backgroundColor: color }} onClick={() => this.toggleStatus()}>
				<p style={{width: "fit-content"}}>{username + ": " + this.props.message.text}</p>
			</div>
			{status}
		</div>);
	}
	toggleStatus() {
		let show_status = this.state.show_status;
		this.setState({...this.state, show_status: !show_status});
	}
	componentDidMount() {
		
		api.get_user(this.props.message.from_user.username).then((user_profile) => {
			this.setState({ ...this.state, color: user_profile.color, display_name: user_profile.name }, () => {
				this.setState({ ...this.state, loading: false });
			});
		});
		if (this.props.message.from_user.username !== this.props.getUsername()) {
			this.setState({...this.state, read_thread: setInterval(() => {
				if (this.myRef.current !== undefined) {
					const wasSeen = isInViewport(this.myRef.current) && !document.hidden;
					if (wasSeen) {
						this.props.readMessage(this.props.message);
					}
				}
			}, 10)});
		}
		if (this.props.message.timestamp !== undefined) {
			this.setState({...this.state, time_updater: setInterval(() => {
				if (Date.now()-this.props.message.timestamp < 60*1000) {
					this.setState({...this.state, time: "now"});
				} else if (Date.now()-this.props.message.timestamp < 60*60*1000) {
					this.setState({...this.state, time: Math.floor((Date.now()-this.props.message.timestamp)/(60*1000))+" min"});
				} else {
					let date = new Date(this.props.message.timestamp);
					let hours = date.getHours()%12;
					let am = (date.getHours() < 13) ? "AM" : "PM";
					if (hours === 0) {
						hours = 12;
					}
					let minutes = date.getMinutes();
					if (minutes < 10) {
						minutes = "0"+minutes;
					}
					let time = hours + ":" + minutes + " " + am;
					if (Date.now()-this.props.message.timestamp > 24*60*60*1000) {
						let day = (date.getMonth()+1)+"/"+date.getDate();
						if (new Date(Date.now()).getFullYear() !== date.getFullYear()) {
							day = day + "/" + date.getFullYear();
						}
						time = time + " " + day;
					}
					if (time !== this.state.time) {
						this.setState({...this.state, time: time});
					}
				}
			}, 10)});
		}
	}
	componentWillUnmount() {
		clearInterval(this.state.read_thread);
		clearInterval(this.state.time_updater);
	}
}

class MessageBox extends React.Component {
	render() {
		//Send button disabled
		//<button className='SendMessageButton' onClick={() => this.sendMessage()}>Send</button>
		return (<div>
			<input className='MessageBoxInput' placeholder="Send Message" id="SendMessageText" onKeyDown={(event) => { input_keypressed(event, () => { this.sendMessage() }) }} ref={this.props.inputRef}></input>
		</div>);
	}

	sendMessage() {
		let message_text = document.getElementById("SendMessageText").value;
		if (message_text === "") {
			return;
		}
		document.getElementById("SendMessageText").value = "";
		let token = this.props.getToken();
		api.send_message(message_text, token, this.props.getChat().id);
	}
}

class SignInScreen extends React.Component {
	constructor(props) {
		super(props);
		this.state = { error: null };
	}
	render() {
		return (<div className='Log In'>
			<h1>Log In</h1>
			<p>Username: <input type="text" className='StyledInput' id="login_username"></input></p>
			<p>Password: <input type="text" className='StyledInput' id="login_password"></input></p>
			<p>Display Name: <input type="text" className='StyledInput' id="login_display_name"></input></p>
			<p className='ErrorText'>{this.state.error}</p>
			<button className='StyledButton' onClick={() => this.login()}>Log in</button>
		</div>);
	}
	login() {
		let username = document.getElementById("login_username").value;
		let display_name = document.getElementById("login_display_name").value;
		let password = document.getElementById("login_password").value;
		if (username.slice(-1) === " ") {
			username = username.substring(0,username.length-1);
		}
		var hasInvalidCharacters = [...username].some(char => char.charCodeAt(0) > 127 || char.charCodeAt(0) === 32);
		if (hasInvalidCharacters) {
			this.setState({ ...this.state, error: "Username has invalid characters" });
			return;
		}
		if (username.length === 0) {
			this.setState({ ...this.state, error: "Username is empty" });
			return;
		}
		if (password.length === 0) {
			this.setState({ ...this.state, error: "Password is empty" });
			return;
		}
		if (display_name.length === 0) {
			this.setState({ ...this.state, error: "Display name is empty" });
			return;
		}
		api.login(username, password).then((json) => {
			if (json["server"] !== undefined) {
				if (json["server"] === "incorrect password") {
					this.setState({ ...this.state, error: "Incorrect password" });
				} else {
					this.setState({ ...this.state, error: "An unknown error occured" });
				}
			} else {
				this.props.setUser(json.token, username, () => {
					api.set_user_profile(json.token, display_name, "#683dd4").then(() => {
						api.subscribeEvents(json.token, this.props.onReceivedMessage);
						this.props.homeScreen();
					});
				});

			}
		});
	}
}

class NewChatScreen extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			error: null
		};
	}
	render() {
		return <div>
			<input type="text" className='StyledInput' defaultValue="New Chat" id="newChatChatName"></input>
			<NewChatMembers setError={(error) => this.setState({ ...this.state, error: error })} create_chat={(members) => this.create_chat(members)} getUsername={this.props.getUsername}></NewChatMembers>

			<BackArrow onClick={() => this.props.homeScreen()}></BackArrow>
		</div>;
	}

	create_chat(members) {
		let chatName = document.getElementById("newChatChatName").value;

		members.push({ username: this.props.getUsername() });
		api.create_chat(chatName, members, this.props.getUsername()).then((chat) => {
			this.props.chatScreen(chat);
		});
	}
}

class NewChatButton extends React.Component {
	render() {
		return (<div className="NewChatButton" onClick={this.props.onClick}>
			<p className="noselect">NC</p>
		</div>);
	}
}

class BackArrow extends React.Component {
	render() {
		return (<div className="SquareButton" onClick={this.props.onClick}>
			<p className="noselect">Back</p>
		</div>);
	}
}

class SettingsButton extends React.Component {
	render() {
		return (<div className="SettingsButton" onClick={this.props.onClick}>
			<p className='noselect'>Settings</p>
		</div>);
	}
}

class EditButton extends React.Component {
	render() {
		return (<div className="SettingsButton" onClick={this.props.onClick}>
			<p className='noselect'>Edit</p>
		</div>);
	}
}

class NewChatMembers extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			members: [],
			error: null,
		};
	}
	render() {
		let members_list_div = [];
		for (var i = 0; i < this.state.members.length; i++) {
			members_list_div.push(<p key={this.state.members[i].username}>{this.state.members[i].name + " (" + this.state.members[i].username + ")"}</p>);
		}
		return (<div>
			{members_list_div}
			<p className='New-chat-add-member'>Add Member: <input type="text" id="newChatMemberInput" className='StyledInput' onInput={(val) => { this.update_user_search(val); input_keypressed(val) }} onKeyDown={(event) => input_keypressed(event, () => { this.add_member(event.target.value); })}></input><button className='StyledButton' onClick={() => this.add_member(document.getElementById("newChatMemberInput").value)}>Add</button></p>
			<button className='StyledButton' onClick={() => this.create_chat()}>Create</button>
			<p className='ErrorText'>{this.state.error}</p>
		</div>);
	}
	create_chat() {
		this.add_member(document.getElementById("newChatMemberInput").value, () => {
			this.props.create_chat(this.state.members);
		});
	}
	add_member(member, callback) {
		console.log("adding: " + member);
		if (member === "") {
			this.setState({ ...this.state, error: "User is empty" }, callback);
			return;
		}
		if (member === this.props.getUsername()) {
			this.setState({ ...this.state, error: "You will automatically be in this chat" }, callback);
			return;
		}
		api.get_user(member).then((json) => {
			if (json.server !== "no user") {
				let in_members = false;
				for (var i = 0; i < this.state.members.length; i++) {
					if (this.state.members[i].username === json.username) {
						in_members = true;
					}
				}
				if (!in_members) {
					let members = this.state.members;
					members.push(json);
					this.setState({ ...this.state, members: members }, callback);
					this.setState({ ...this.state, error: "" });
				}
			} else {
				this.setState({ ...this.state, error: "That user does not exist" }, callback);
			}
		})
	}
	update_user_search(input) {

	}
}

function input_keypressed(event, callback) {
	if (event.key === "Enter") {
		event.preventDefault();
		callback();
	}
}

function hexToRgb(hex) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16)
	} : null;
}

function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

function spawnNotification(body, icon, title) {
	const notification = new Notification(title, { body, icon });
}

//writen by chatGPT section
function getQueryParams(url) {
	const queryStartIndex = url.indexOf('?');
	const query = queryStartIndex !== -1 ? url.slice(queryStartIndex + 1) : '';
	const queryParams = {};
	
	query.split('&').forEach(param => {
	  const [name, value] = param.split('=');
	  if (name) {
		queryParams[name] = value ? decodeURIComponent(value.replace(/\+/g, ' ')) : '';
	  }
	});
	
	return queryParams;
  }
  
function stringToNumberKeys(stringMap) {
	const numberMap = new Map();
	for (const [key, value] of stringMap.entries()) {
	  const numberKey = Number(key);
	  numberMap.set(numberKey, value);
	}
	return numberMap;
  }

export default App;