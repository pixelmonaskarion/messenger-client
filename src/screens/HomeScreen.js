import api from "../Api.js";
import React from 'react';

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

class NewChatButton extends React.Component {
	render() {
		return (<div className="NewChatButton" onClick={this.props.onClick}>
			<p className="noselect">NC</p>
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

export default HomeScreen;