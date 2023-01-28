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
				saved_state = { ...saved_state, chats: JSON.parse(localStorage.getItem('chats')) };
			}
			if (window.localStorage.getItem('messages') !== null && localStorage.getItem('messages') !== "undefined") {
				saved_state = { ...saved_state, messages: JSON.parse(localStorage.getItem('messages')) };
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
			} else {
				api.subscribeEvents(saved_state.token, (message) => this.onReceivedMessage(message));
			}
			this.setState({
				...saved_state,
				screen: saved_screen,
			}, () => {
				this.setState({ ...this.state, loading: false });
			});
		});
	}
	render() {
		if (this.state.loading === true) {
			return <header className="App-header">Loading...</header>
		}
		let content = null;
		if (this.state.screen === "chats") {
			content = <HomeScreen addChat={(id, chat, callback) => this.addChat(id, chat, callback)} settings={() => this.settings()} chatScreen={(chat) => this.chatScreen(chat)} newChat={() => this.newChat()} getChats={() => this.state.chats} getMessages={() => this.state.messages} getToken={() => this.state.token}></HomeScreen>;
		} else if (this.state.screen === "new chat") {
			content = <NewChatScreen homeScreen={() => this.homeScreen()} getUsername={() => { return this.state.username; }} chatScreen={(chat) => this.chatScreen(chat)}></NewChatScreen>
		} else if (this.state.screen === "sign in") {
			content = <SignInScreen setUser={(token, username, callback) => { this.setState({ ...this.state, token: token, username: username }, callback); }} homeScreen={() => this.homeScreen()} onReceivedMessage={(message) => this.onReceivedMessage(message)}></SignInScreen>;
		} else if (this.state.screen === "chat") {
			content = <ChatScreen addChat={(id, chat, callback) => {this.addChat(id, chat, callback)}} chatSettings={(chat) => {this.chatSettings(chat)}} homeScreen={() => this.homeScreen()} getChat={() => this.state.chats[String(this.state.active_chat)]} getToken={() => this.state.token} getMessages={() => this.state.messages} getUsername={() => this.state.username}></ChatScreen>
		} else if (this.state.screen == "settings") {
			content = <SettingsScreen homeScreen={() => this.homeScreen()} getToken={() => this.state.token} getUsername={() => this.state.username}></SettingsScreen>
		} else if (this.state.screen == "chat settings") {
			content = <ChatSettingsScreen addChat={(id, chat, callback) => {this.addChat(id, chat, callback)}} getToken={() => this.state.token} chatScreen={(chat) => this.chatScreen(chat)} getChat={() => this.state.chats[String(this.state.active_chat)]}></ChatSettingsScreen>
		}
		return (<div className="App">
			{content}
		</div>);
	}
	addChat(id, chat, callback) {
		let chats = this.state.chats;
		chats[id] = chat;
		if (chat.server === "no chat") {
			chats[id] = undefined;
		}
		this.setState({ ...this.state, chats: chats}, callback);
	}
	chatSettings(chat) {
		let chats_copy = { ...this.state.chats };
		chats_copy[String(chat.id)] = chat;
		let new_state = { ...this.state, chats: chats_copy, active_chat: chat.id };
		this.setState(new_state, () => {
			this.setState({ ...this.state, screen: "chat settings" });
		});
	}
	newChat() {
		this.setState({ ...this.state, screen: "new chat" });
	}

	homeScreen() {
		/*Notification.requestPermission().then((value) => {
			console.log(value);
		});*/
		this.setState({ ...this.state, screen: "chats" });
	}

	settings() {
		this.setState({ ...this.state, screen: "settings" });
	}

	chatScreen(chat) {
		let chats_copy = { ...this.state.chats };
		chats_copy[String(chat.id)] = chat;
		let messages_copy = { ...this.state.messages };
		if (messages_copy[String(chat.id)] === undefined) {
			messages_copy[String(chat.id)] = [];
		}
		let new_state = { ...this.state, chats: chats_copy, active_chat: chat.id, messages: messages_copy };
		this.setState(new_state, () => {
			this.setState({ ...this.state, screen: "chat" });
		});
	}

	onReceivedMessage(message) {
		let message_object = JSON.parse(message).message;
		let finish = () => {
			api.received_message(this.state.token, message_object.id);
			if (this.state.chats[String(message_object.chat)] !== undefined) {
				let messages = this.state.messages;
				messages[String(message_object.chat)].push(message_object);
				this.setState({ ...this.state, messages: messages });
			} else {
				api.get_chat(message_object.chat, this.state.token).then((chat) => {
					let chats_copy = { ...this.state.chats };
					chats_copy[String(chat.id)] = chat;
					let messages_copy = { ...this.state.messages };
					if (messages_copy[String(chat.id)] === undefined) {
						messages_copy[String(chat.id)] = [];
					}
					messages_copy[String(chat.id)].push(message_object);
					let new_state = { ...this.state, chats: chats_copy, active_chat: chat.id, messages: messages_copy };
					this.setState(new_state);
				});
			}
		};
		if (this.state.chats === undefined) {
			this.setState({ ...this.state, chats: [] }, finish);
		} else {
			finish();
		}
	}

	componentDidUpdate() {
		if (typeof(Storage) !== "undefined") {
			if (this.state.loading === false && this.state.screen !== "sign in") {
				window.localStorage.setItem("username", JSON.stringify(this.state.username));
				window.localStorage.setItem("token", JSON.stringify(this.state.token));
				window.localStorage.setItem("chats", JSON.stringify(this.state.chats));
				window.localStorage.setItem("messages", JSON.stringify(this.state.messages));
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
			for (let i = 0; i < Object.values(this.props.getChats()).length; i++) {
				let id = Object.values(this.props.getChats())[i].id;
				api.get_chat(id, this.props.getToken()).then((chat) => {
					this.props.addChat(id, chat);
				});
			}
		}
	}
	render() {
		let chats = [];
		if (this.props.getChats() !== undefined) {
			for (var i = 0; i < Object.values(this.props.getChats()).length; i++) {
				chats.push(<ChatPreview key={JSON.stringify(Object.values(this.props.getChats())[i])} chat={Object.values(this.props.getChats())[i]} messages={this.props.getMessages()[String(Object.values(this.props.getChats())[i].id)]} chatScreen={this.props.chatScreen}></ChatPreview>);
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
				message_preview = <p className='MessagePreviewBody'>{this.props.messages[this.props.messages.length - 1].from_user.username}: {this.props.messages[this.props.messages.length - 1].text}</p>;
			}
		}
		return (<div onClick={() => (this.props.chatScreen(this.props.chat))}>
			<h1 className="MessagePreview">{this.props.chat.name}</h1>
			{message_preview}
		</div>);
	}
}

class ChatSettingsScreen extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			users: []
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
		return (<div>
			<BackArrow onClick={() => this.props.chatScreen(this.props.getChat())}></BackArrow>
			<h1>Chat Name: <br></br><input className='StyledInput' defaultValue={this.props.getChat().name} id="chat_settings_new_name_input"></input><button id="chat_settings_new_name_button" onClick={() => this.change_name()}>Update</button></h1>
			<h1>Users:</h1>
			<div>{this.state.users}</div>
			<p>Add User: <input id="chat_settings_add_user_input" className='StyledInput'></input><button id="chat_settings_add_user_button" className='StyledButton' onClick={() => this.add_users()}>Add</button></p>
		</div>);
	}

	change_name() {
		api.edit_chat(document.getElementById("chat_settings_new_name_input").value, [], this.props.getChat().admin, this.props.getChat().id, this.props.getToken());
	}

	add_users() {
		if (this.props.getChat().admin === undefined) {
			this.props.getChat().admin = {username: "chrissy"};
		}
		if (document.getElementById("chat_settings_add_user_input").value !== "") {
			api.edit_chat(document.getElementById("chat_settings_new_name_input").value, [{username: document.getElementById("chat_settings_add_user_input").value}], this.props.getChat().admin, this.props.getChat().id, this.props.getToken()).then(() => {
				api.get_chat(this.props.getChat().id, this.props.getToken()).then((chat) => {
					this.props.addChat(this.props.getChat().id, chat, () => {
						this.update_users();
					});
				});
			});
		}
	}
}

class ChatScreen extends React.Component {
	componentDidMount() {
		api.get_chat(this.props.getChat().id, this.props.getToken()).then((chat) => {
			this.props.addChat(this.props.getChat().id, chat);
		});
	}

	render() {
		let messages = [];
		for (var i = 0; i < this.props.getMessages()[String(this.props.getChat().id)].length; i++) {
			let message = this.props.getMessages()[String(this.props.getChat().id)][i];
			let above = this.props.getMessages()[String(this.props.getChat().id)][i - 1];
			let below = this.props.getMessages()[String(this.props.getChat().id)][i + 1];
			messages.push(<Message above={above} below={below} index={i} messagesLength={this.props.getMessages()[String(this.props.getChat().id)].length} key={JSON.stringify(message)} message={message} getUsername={this.props.getUsername}></Message>)
		}
		return (<div>
			<div style={{"zindex":1}}>
				<h1 className='AbsoluteTitle'>{this.props.getChat().name} </h1>
			</div>
			<div className='AllMessages' id="allMessages">{messages}</div>
			<MessageBox getToken={this.props.getToken} getChat={this.props.getChat}></MessageBox>
			<BackArrow onClick={() => this.props.homeScreen()}></BackArrow>
			<SettingsButton onClick={() => this.props.chatSettings(this.props.getChat())}></SettingsButton>
		</div>);
	}
}

class Message extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loading: true,
			show_status: false,
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
			username = this.state.display_name;
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
		if (show_bottom_info || this.state.show_status) {
			status = <p className={'StatusText'+from_me}>{status_text}</p>;
		}
		return (<div>
			<div className={'Message' + from_me + position} style={{ backgroundColor: color }} onClick={() => this.toggleStatus()}>
				<p>{username + ": " + this.props.message.text}</p>
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
	}
}

class MessageBox extends React.Component {
	render() {
		//Send button disabled
		//<button className='SendMessageButton' onClick={() => this.sendMessage()}>Send</button>
		return (<div>
			<input className='MessageBoxInput' placeholder="Send Message" id="SendMessageText" onKeyDown={(event) => { input_keypressed(event, () => { this.sendMessage() }) }}></input>
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
					api.set_user_profile(json.token, display_name, "#683dd4");
					api.subscribeEvents(json.token, this.props.onReceivedMessage);
					this.props.homeScreen();
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
			<button className='StyledButton' onClick={() => this.props.create_chat(this.state.members)}>Create</button>
			<p className='ErrorText'>{this.state.error}</p>
		</div>);
	}
	add_member(member) {
		if (member === "") {
			this.setState({ ...this.state, error: "User is empty" });
			return;
		}
		if (member === this.props.username) {
			this.setState({ ...this.state, error: "You will automatically be in this chat" });
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
					this.setState({ ...this.state, members: members });
					this.setState({ ...this.state, error: "" });
				}
			} else {
				this.setState({ ...this.state, error: "That user does not exist" });
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


export default App;
