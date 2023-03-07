import api from "../Api.js";
import React from 'react';
import { input_keypressed } from "../SharedFunctions.js";
import { BackArrow } from "../SharedComponents.js";
import Message from "../Message.js";

class ChatScreen extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			highlightedMessage: undefined,
			message_input_ref: React.createRef(),
			cachedUsers: new Map(),
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
				messages.push(<Message setHighlighted={this.props.setHighlighted} getHighlighted={this.props.getHighlighted} getToken={this.props.getToken} getUser={async (user) => { return await this.get_user(user) }} readMessage={this.props.readMessage} above={above} below={below} index={i} messagesLength={this.props.getMessages().get(this.props.getChat().id).length} key={JSON.stringify(message)} message={message} getUsername={this.props.getUsername}></Message>);
			}
		}
		return (<div>
			<div style={{ "zindex": 1 }}>
				<h1 className='AbsoluteTitle'>{this.props.getChat().name} </h1>
			</div>
			<div className='AllMessages' id="allMessages" onClick={() => { this.props.setHighlighted(undefined) }}>{messages}</div>
			<MessageBox getToken={this.props.getToken} getChat={this.props.getChat} inputRef={this.state.message_input_ref}></MessageBox>
			<BackArrow onClick={() => this.props.homeScreen()}></BackArrow>
			<EditButton onClick={() => this.props.chatSettings(this.props.getChat())}></EditButton>
		</div>);
	}

	async get_user(username) {
		if (this.state.cachedUsers.has(username)) {
			if (typeof (this.state.cachedUsers.get(username)) === Promise) {
				return await this.state.cachedUsers.get(username);
			}
			return this.state.cachedUsers.get(username);
		} else {
			this.state.cachedUsers.set(username, api.get_user(username));
			this.state.cachedUsers.set(username, await this.state.cachedUsers.get(username));
			return this.state.cachedUsers.get(username);
		}
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

class EditButton extends React.Component {
	render() {
		return (<div className="SettingsButton" onClick={this.props.onClick}>
			<p className='noselect'>Edit</p>
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

export default ChatScreen;