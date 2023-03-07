import { BackArrow } from '../SharedComponents';
import api from "../Api.js";
import React from 'react';

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
		this.setState({ ...this.state, users: [] }, () => {
			for (let i = 0; i < this.props.getChat().users.length; i++) {
				api.get_user(this.props.getChat().users[i].username).then((user) => {
					let users = this.state.users;
					users.push(<p key={user.username}>{user.name + " (" + user.username + ")"}</p>);
					this.setState({ ...this.state, users: users });
				});
			}
		});
	}

	render() {
		let link = [];
		if (this.state.link !== undefined) {
			let link_text = encodeURI(window.location.origin + "/?joinchat=" + this.state.link);
			link.push(<p key="link text" style={{ fontSize: "20px" }}>{link_text}</p>);
			link.push(<button key="copy button" className='StyledButton' style={{ fontSize: "20px", marginRight: "2px" }} onClick={() => {
				navigator.clipboard.writeText(link_text);
			}}>Copy</button>);
			link.push(<button key="share button" className='StyledButton' style={{ fontSize: "20px", marginLeft: "2px" }} onClick={() => {
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
			<button className='StyledButton' style={{ fontSize: "20px" }} onClick={() => { this.get_link() }}>Create Link</button>
			{link}
			<p>Add User: <input id="chat_settings_add_user_input" className='StyledInput'></input><button id="chat_settings_add_user_button" className='StyledButton' onClick={() => this.add_users()}>Add</button></p>
		</div>);
	}

	async get_link() {
		if (this.state.link === undefined) {
			let link_id = await api.create_chat_link(this.props.getChat().id, this.props.getToken());
			this.setState({ ...this.state, link: link_id.join_code });
		}
	}

	change_name() {
		api.edit_chat(document.getElementById("chat_settings_new_name_input").value, [], this.props.getChat().admin, this.props.getChat().id, this.props.getToken());
	}

	add_users() {
		if (this.props.getChat().admin === undefined) {
			this.props.getChat().admin = { username: "chrissy" };
		}
		if (document.getElementById("chat_settings_add_user_input").value !== "" && !this.user_in_chat(document.getElementById("chat_settings_add_user_input").value)) {
			api.edit_chat(document.getElementById("chat_settings_new_name_input").value, [{ username: document.getElementById("chat_settings_add_user_input").value }], this.props.getChat().admin, this.props.getChat().id, this.props.getToken()).then(() => {
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

export default ChatSettingsScreen;