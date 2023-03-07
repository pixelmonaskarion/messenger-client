import { BackArrow } from '../SharedComponents';
import { input_keypressed } from '../SharedFunctions';
import api from "../Api.js";
import React from 'react';

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
				} else {
					this.setState({ ...this.state, error: "That user is already in this chat" }, callback);
				}
			} else {
				this.setState({ ...this.state, error: "That user does not exist" }, callback);
			}
		});
	}
	update_user_search(input) {

	}
}

export default NewChatScreen;