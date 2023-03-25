import imageCompression from 'browser-image-compression';
import api from "../Api.js";
import React from 'react';
import {hexToRgb, RGBToHSL} from "../SharedFunctions";
import { BackArrow } from '../SharedComponents';

class SettingsScreen extends React.Component {
	constructor(props) {
		super(props);
		this.pfpImageRef = React.createRef();
		this.state = {
			loading: true,
		};
	}

	async componentDidMount() {
		let user_profile = await api.get_user(this.props.getUsername());
		if (user_profile.pfp !== "undefined") {
			let image_file = new File([await (await fetch(user_profile.pfp)).blob()], user_profile.pfp.split("/").pop());
			let extension = image_file.name.split('.').pop();
			let img = <img alt="" ref={this.pfpImageRef} src={user_profile.pfp} className="BigProfilePictureImage"></img>;
			this.setState({ ...this.state, pfp: img, pfp_file: image_file, extension: extension });
		}
		this.setState({ ...this.state, name: user_profile.name, color: user_profile.color, }, () => {
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
			content.push(<h1 key="pfp title">Profile Picture</h1>);
			let color_object = hexToRgb(this.state.color);
			let text_color = "black";
			if (RGBToHSL(color_object.r, color_object.g, color_object.b)[2] < 50) {
				text_color = "white";
			}
			if (this.state.pfp === undefined) {
				content.push(<div key="pfp view" style={{ left: "50%", position: "relative", flex: "block" }}>
					<div className='BigProfilePicture' style={{ backgroundColor: this.state.color }}>
						<span style={{ color: text_color }} className='ProfilePictureText'>{this.state.name.charAt(0).toUpperCase()}</span>
					</div>
				</div>);
			} else {
				let pfp_image = this.state.pfp;
				content.push(<div key="pfp view" style={{ position: "relative", flex: "block" }}>
					{pfp_image}
				</div>);
			}
			if (window.showOpenFilePicker !== undefined) {
				content.push(<button className='StyledButton' key="upload-pfp-button" onClick={
					async () => {
						let fileHandle;
						[fileHandle] = await window.showOpenFilePicker({ types: [{ description: "Image", accept: { 'image/*': ['.png', '.gif', '.jpeg', '.jpg'] } }] });
						let image_file = await fileHandle.getFile();
						console.log('originalFile instanceof Blob', image_file instanceof Blob); // true
						console.log(`originalFile size ${image_file.size / 1024 / 1024} MB`);
						const options = {
							maxSizeMB: 0.1,
							maxWidthOrHeight: 500,
							useWebWorker: true
						}
						try {
							const compressedFile = await imageCompression(image_file, options);
							console.log('compressedFile instanceof Blob', compressedFile instanceof Blob); // true
							console.log(`compressedFile size ${compressedFile.size / 1024 / 1024} MB`);
							let extension = image_file.name.split('.').pop();
							let img = <img alt=""  ref={this.pfpImageRef} src={await readImage(compressedFile)} className="BigProfilePictureImage"></img>;
							this.setState({ ...this.state, pfp: img, pfp_file: compressedFile, extension: extension });
						} catch (error) {
							console.log(error);
						}
					}} accept="image/*">Upload Image</button>);
			} else {
				content.push(<input key="upload-pfp-button" type="file" accept='image/*' onChange={async (event) => {
					const { target } = event;
					const { files } = target;
					let image_file = files[0];
					console.log('originalFile instanceof Blob', image_file instanceof Blob); // true
					console.log(`originalFile size ${image_file.size / 1024 / 1024} MB`);
					const options = {
						maxSizeMB: 0.1,
						maxWidthOrHeight: 500,
						useWebWorker: true
					}
					try {
						const compressedFile = await imageCompression(image_file, options);
						console.log('compressedFile instanceof Blob', compressedFile instanceof Blob); // true
						console.log(`compressedFile size ${compressedFile.size / 1024 / 1024} MB`);
						let extension = image_file.name.split('.').pop();
						let img = <img alt=""  ref={this.pfpImageRef} src={await readImage(compressedFile)} className="BigProfilePictureImage"></img>;
						this.setState({ ...this.state, pfp: img, pfp_file: compressedFile, extension: extension });
					} catch (error) {
						console.log(error);
					}

				}}></input>);
			}
			content.push(<br key="br before update"></br>);
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
			<ConnectedDevicesButton onClick={() => this.props.connectedDevicesScreen()}></ConnectedDevicesButton>
			<h1>Settings</h1>
			{content}
		</div>);
	}

	update(name, color) {
		if (name === "") {
			this.setState({ ...this.state, error: "Display Name is empty", success: false });
			return;
		}
		this.setState({ ...this.state, name: name, color: color });
		api.set_user_profile(this.props.getToken(), name, color).then(() => {
			this.setState({ ...this.state, success: true, error: undefined });
		});
		if (this.state.pfp_file !== undefined) {
			api.change_pfp(this.state.pfp_file, this.state.extension, this.props.getToken()).then((response) => {
				if (!response.ok) {
					this.setState({ ...this.state, success: false, error: "Image Upload failed, try using a smaller image" });
				}
			});
		}
	}
}

class ConnectedDevicesButton extends React.Component {
	render() {
		return (<div className="ConnectedDevicesButton" onClick={this.props.onClick}>
			<p className="noselect">CD</p>
		</div>);
	}
}

async function readImage(file) {
	// Check if the file is an image.
	if (file.type && !file.type.startsWith('image/')) {
		console.log('File is not an image.', file.type, file);
		return;
	}

	/*const reader = new FileReader();
	reader.addEventListener('load', (event) => {
		return event.target.result;
	});
	reader.readAsDataURL(file);*/
	let image = (await readFileAsync(file));
	return image;
}

function readFileAsync(file) {
	return new Promise((resolve, reject) => {
		let reader = new FileReader();

		reader.onload = () => {
			resolve(reader.result);
		};

		reader.onerror = reject;

		reader.readAsDataURL(file);
	})
}

export default SettingsScreen;