import api from "../Api.js";
import React from 'react';
import Crypto from "../Crypto.js";

class SignInScreen extends React.Component {
	constructor(props) {
		super(props);
		this.state = { error: null };
	}
	render() {
		return (<div className='Log In'>
			<h1>Sign Up</h1>
			<p>Username: <input type="text" className='StyledInput' id="login_username"></input></p>
			<p>Password: <input type="text" className='StyledInput' id="login_password"></input></p>
			<p>Display Name: <input type="text" className='StyledInput' id="login_display_name"></input></p>
			<p className='ErrorText'>{this.state.error}</p>
			<button className='StyledButton' onClick={() => this.login()}>Sign Up</button>
			<h1>Already Have an account?</h1>
			<button className='StyledButton' onClick={() => this.props.qrScreen()}>Connect Device</button>

		</div>);
	}
	async login() {
		let username = document.getElementById("login_username").value;
		let display_name = document.getElementById("login_display_name").value;
		let password = document.getElementById("login_password").value;
		if (username.slice(-1) === " ") {
			username = username.substring(0, username.length - 1);
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
		let keys = await Crypto.generateKeyPair();
		let json = api.create_account(username, password, display_name, "#5c2ed1", keys.publicKey);
		if (json["server"] !== undefined) {
			if (json["server"] === "incorrect password") {
				this.setState({ ...this.state, error: "Incorrect password" });
			} else if (json["server"] === "exists") {
				this.setState({ ...this.state, error: "That account already exists, log in separately" });
			} else {
				this.setState({ ...this.state, error: "An unknown error occured" });
			}
		} else {
			this.props.setUser(json.token, username, password, keys);
		}
	}
}

export default SignInScreen;