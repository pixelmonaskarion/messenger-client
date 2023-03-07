import './App.css';
import api from "./Api.js";
import React from 'react';
import "long-press-event";
import Crypto from './Crypto.js';
import SignInScreen from './screens/SignInScreen';
import SettingsScreen from "./screens/SettingsScreen";
import HomeScreen from './screens/HomeScreen';
import ChatSettingsScreen from './screens/ChatSettingsScreen';
import NewChatScreen from './screens/NewChatScreen';
import ChatScreen from './screens/ChatScreen';

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
			if (window.localStorage.getItem('private_key') !== null && localStorage.getItem('private_key') !== "undefined") {
				saved_state = { ...saved_state, token: JSON.parse(localStorage.getItem('private_key')) };
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
			content = <HomeScreen sortChats={() => this.sortChats()} addChat={(id, chat, callback) => this.addChat(id, chat, callback)} settings={() => this.settings()} chatScreen={(chat) => this.chatScreen(chat)} newChat={() => this.newChat()} getChats={() => this.state.chats} getMessages={() => this.state.messages} getToken={() => this.state.token}></HomeScreen>;
		} else if (this.state.screen === "new chat") {
			content = <NewChatScreen homeScreen={() => this.homeScreen()} getUsername={() => { return this.state.username; }} chatScreen={(chat) => this.chatScreen(chat)}></NewChatScreen>
		} else if (this.state.screen === "sign in") {
			content = <SignInScreen setUser={(token, username, callback) => { this.setState({ ...this.state, token: token, username: username }, callback); }} homeScreen={() => this.homeScreen()} onReceivedMessage={(message) => this.onReceivedMessage(message)}></SignInScreen>;
		} else if (this.state.screen === "chat") {
			content = <ChatScreen getHighlighted={() => this.state.highlightedMessage} setHighlighted={(message) => { this.setHighlighted(message) }} readMessage={(message) => this.readMessage(message)} addChat={(id, chat, callback) => { this.addChat(id, chat, callback) }} chatSettings={(chat) => { this.chatSettings(chat) }} homeScreen={() => this.homeScreen()} getChat={() => this.getChat()} getToken={() => this.state.token} getMessages={() => this.state.messages} getUsername={() => this.state.username}></ChatScreen>
		} else if (this.state.screen === "settings") {
			content = <SettingsScreen homeScreen={() => this.homeScreen()} getToken={() => this.state.token} getUsername={() => this.state.username}></SettingsScreen>
		} else if (this.state.screen === "chat settings") {
			content = <ChatSettingsScreen addChat={(id, chat, callback) => { this.addChat(id, chat, callback) }} getToken={() => this.state.token} chatScreen={(chat) => this.chatScreen(chat)} getChat={() => this.getChat()}></ChatSettingsScreen>
		}
		return (<div className="App">
			{content}
		</div>);
	}
	setHighlighted(message) {
		this.setState({ ...this.state, highlightedMessage: message });
	}

	getChat() {
		return this.state.chats.get(this.state.active_chat);
	}
	readMessage(message) {
		if (this.state.chats.get(message.chat) !== undefined) {
			let messages = this.state.messages;
			for (var i = 0; i < messages.get(message.chat).length; i++) {
				if (messages.get(message.chat)[i].id === message.id) {
					if (messages.get(message.chat)[i].seen !== true) {
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
		if (chats === undefined) {
			chats = new Map();
		}
		chats.set(id, chat);
		if (chat.server !== undefined) {
			chats.delete(id);
		}
		this.setState({ ...this.state, chats: chats }, callback);
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
		if (chats_copy === undefined) {
			chats_copy = new Map();
		}
		chats_copy.set(chat.id, chat);
		let messages_copy = this.state.messages;
		if (messages_copy === undefined) {
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
		if (this.state.messages === undefined) {
			//I know what I'm doing
			// eslint-disable-next-line
			this.state.messages = new Map();
		}
		let message_object = JSON.parse(message);
		console.log(message_object);
		let finish = () => {
			if (message_object.read !== undefined) {
				if (message_object.read.from !== this.state.username) {	
					if (this.state.chats.get(message_object.read.message.chat) !== undefined) {
						let messages = this.state.messages;
						for (let i = 0; i < messages.get(message_object.read.message.chat).length; i++) {
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
				message_object.message = Crypto.decrypt_message(message_object.message, "1234");
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
			} else if (message_object.reaction !== undefined) {
				if (this.state.chats.get(message_object.reaction.chat) !== undefined) {
					let all_messages = this.state.messages;
					let messages = all_messages.get(message_object.reaction.chat);
					for (let i = 0; i < messages.length; i++) {
						if (messages[i].id === message_object.reaction.message) {
							if (messages[i].reactions === undefined) {
								messages[i].reactions = {};
							}
							messages[i].reactions[message_object.reaction.from] = message_object.reaction.emoji;
						}
					}
					this.setState({ ...this.state, messages: messages });
				}
			}
			this.sortChats();
		};
		if (this.state.chats === undefined) {
			this.setState({ ...this.state, chats: new Map() }, finish);
		} else {
			finish();
		}
	}

	sortChats() {
		if (this.state.chats === undefined || this.state.messages === undefined) {
			return;
		}
		let chats = this.state.chats;
		let messages = this.state.messages;
		for (let chatid of messages.keys()) {
			messages.set(chatid, messages.get(chatid).sort((a, b) => {
				if (a.timestamp !== undefined && b.timestamp !== undefined) {
					return a.timestamp - b.timestamp;
				}
				return 0;
			}));
		}
		chats = new Map([...chats.entries()].sort((a, b) => {
			if (messages.get(a[0]) !== undefined && messages.get(b[0]) !== undefined) {
				if (messages.get(a[0]).length > 0 && messages.get(b[0]).length > 0) {
					let a_last = messages.get(a[0])[messages.get(a[0]).length - 1];
					let b_last = messages.get(b[0])[messages.get(b[0]).length - 1];
					if (a_last.timestamp !== undefined && b_last.timestamp !== undefined) {
						return b_last.timestamp - a_last.timestamp;
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
			return 0;
		}));
		this.setState({ ...this.state, messages: messages, chats: chats });
	}

	componentDidUpdate() {
		if (typeof (Storage) !== "undefined") {
			if (this.state.loading === false && this.state.screen !== "sign in") {
				window.localStorage.setItem("username", JSON.stringify(this.state.username));
				window.localStorage.setItem("token", JSON.stringify(this.state.token));
				window.localStorage.setItem("private_key", JSON.stringify(this.state.private_key));
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

function spawnNotification(body, icon, title) {
	new Notification(title, { body, icon });
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