import api from "./Api.js";
import {hexToRgb, RGBToHSL, isInViewport} from "./SharedFunctions";
import React from 'react';
import { MessageReaction, Reactions } from "./Reactions.js";

class Message extends React.Component {
	constructor(props) {
		super(props);
		this.myRef = React.createRef();
		this.messageRef = React.createRef();
		this.state = {
			loading: true,
			show_status: false,
			time: "",
			mouseDownCallback: undefined,
		};
	}
	render() {
		let from_me = null;
		let color_object = hexToRgb("#555555");
		if (this.props.message.from_user.username === this.props.getUsername()) {
			from_me = "Me";
		} else {
			from_me = "Other";
		}
		if (!this.state.loading) {
			color_object = hexToRgb(this.state.color);
			if (from_me === "Other") {
				color_object.r *= 0.7;
				color_object.g *= 0.7;
				color_object.b *= 0.7;

			}
		}
		if (this.props.getHighlighted() === this.props.message) {
			color_object.r *= 1.5;
			color_object.g *= 1.5;
			color_object.b *= 1.5;
		}
		let color = "rgb(" + color_object.r + "," + color_object.g + "," + color_object.b + ")";
		let position = "";
		let show_bottom_info = false;
		let show_pfp = false;
		let show_name = false;
		if (this.props.messagesLength !== 1) {
			if (this.props.above === undefined || this.props.above.from_user.username !== this.props.message.from_user.username) {
				if (this.props.below !== undefined && this.props.below.from_user.username === this.props.message.from_user.username) {
					position = "Top";
				}
				show_name = true;
			}
			if (this.props.below === undefined || this.props.below.from_user.username !== this.props.message.from_user.username) {
				if (this.props.above !== undefined && this.props.above.from_user.username === this.props.message.from_user.username) {
					position = "Bottom";
				}
				show_bottom_info = true;
				show_pfp = true;
			}
		}
		if (from_me === "Me") {
			show_name = false;
		}
		if (this.props.below === undefined) {
			show_bottom_info = true;
			show_pfp = true;
		}
		let status = undefined;
		let status_text = "Sent";
		if (this.props.message.read !== undefined) {
			status_text = this.props.message.read;
		}

		if ((show_bottom_info || this.state.show_status || this.props.getHighlighted() === this.props.message)) {
			status = <p className={'StatusText' + from_me}>{status_text + " " + this.state.time}</p>;
		}
		let text_color = "black";
		if (RGBToHSL(color_object.r, color_object.g, color_object.b)[2] <= 50) {
			text_color = "white";
		}
		let other_pfp = undefined;
		let me_pfp = undefined;
		let pfp_color = color;
		let inner_pfp = <span style={{ color: text_color }}>{this.props.message.from_user.username.charAt(0).toUpperCase()}</span>;
		if (!show_pfp) {
			pfp_color = "";
			inner_pfp = undefined;
		}
		if (from_me === "Other") {
			if (this.state.pfp === undefined || !show_pfp) {
				other_pfp = <div className={'ProfilePicture'} style={{ backgroundColor: pfp_color, marginLeft: "10px" }}>
					{inner_pfp}
				</div>
			} else if (show_pfp) {
				other_pfp = this.state.pfp;
			}
		}
		if (from_me === "Me") {
			if (this.state.pfp === undefined || !show_pfp) {
				me_pfp = <div className={'ProfilePicture'} style={{ backgroundColor: pfp_color, marginRight: "10px" }}>
					{inner_pfp}
				</div>
			} else if (show_pfp) {
				me_pfp = this.state.pfp;
			}
		}
		let name = undefined;
		if (show_name) {
			name = <span className='MessageUsername'>{this.props.message.from_user.username}</span>;
		}
		let reactions = undefined;
		if (this.props.getHighlighted() === this.props.message) {
			reactions = <Reactions from_me={from_me} react={(emoji) => this.react(emoji)}></Reactions>;
		}
		let message_reaction_elements = [];
		//http://localhost:8000/db/message/298849957/4217050366/2369556355
		if (this.props.message.reactions !== undefined && this.state.reaction_user_colors !== undefined && Object.keys(this.props.message.reactions).length > 0) {
			let message_reactions = this.props.message.reactions;
			for (var user in message_reactions) {
				message_reaction_elements.push(<MessageReaction from_me={from_me} key={user} user={user} emoji={message_reactions[user]} color={this.state.reaction_user_colors[user]}></MessageReaction>);
			}
			message_reaction_elements = <div className={'MessageReactionsOuter'+from_me}>
				{message_reaction_elements}
			</div>;
		}
		return (<div ref={this.myRef} style={{ display: "block" }}>
			{name}
			{reactions}
			<div className={'MessageOuter' + from_me}>
				{other_pfp}

				<div ref={this.messageRef} className={'Message' + from_me + position} style={{ backgroundColor: color }} onClick={() => this.toggleStatus()} data-long-press-delay="500">
					<span style={{ width: "fit-content", color: text_color }}>{this.props.message.text}</span>
				</div>
				{me_pfp}
			</div>
			{message_reaction_elements}
			{status}

		</div>);
	}

	toggleStatus() {
		let show_status = this.state.show_status;
		this.setState({ ...this.state, show_status: !show_status });
	}

	react(emoji) {
		api.react_message(this.props.getToken(), this.props.message.chat, this.props.message.id, emoji);
	}

	componentDidMount() {
		this.props.getUser(this.props.message.from_user.username).then((user_profile) => {
			this.setState({ ...this.state, color: user_profile.color, display_name: user_profile.name }, () => {
				this.setState({ ...this.state, loading: false });
			});
			if (user_profile.pfp !== "undefined") {
				fetch(user_profile.pfp).then((response) => {
					response.blob().then((blob) => {
						let image_file = new File([blob], user_profile.pfp.split("/").pop());
						let extension = image_file.name.split('.').pop();
						let style = {};
						if (this.props.message.from_user.username === this.props.getUsername()) {
							style = { marginRight: "10px" };
						} else {
							style = { marginLeft: "10px" };
						}
						let img = <img alt="" style={style} ref={this.pfpImageRef} src={user_profile.pfp} className="ProfilePictureImage"></img>;
						this.setState({ ...this.state, pfp: img, pfp_file: image_file, extension: extension });
					});
				});
			}
		});
		if (this.props.message.reactions !== undefined) {
			this.get_reaction_user_color().then((reaction_user_colors) => {
				this.setState({...this.state, reaction_user_colors: reaction_user_colors});
			});
		}
		if (this.props.message.from_user.username !== this.props.getUsername()) {
			this.setState({
				...this.state, read_thread: setInterval(() => {
					if (this.myRef.current !== undefined) {
						const wasSeen = isInViewport(this.myRef.current) && !document.hidden;
						if (wasSeen) {
							this.props.readMessage(this.props.message);
						}
					}
				}, 10)
			});
		}
		if (this.props.message.timestamp !== undefined) {
			this.setState({
				...this.state, time_updater: setInterval(() => {
					if (Date.now() - this.props.message.timestamp < 60 * 1000) {
						this.setState({ ...this.state, time: "now" });
					} else if (Date.now() - this.props.message.timestamp < 60 * 60 * 1000) {
						this.setState({ ...this.state, time: Math.floor((Date.now() - this.props.message.timestamp) / (60 * 1000)) + " min" });
					} else {
						let date = new Date(this.props.message.timestamp);
						let hours = date.getHours() % 12;
						let am = (date.getHours() < 13) ? "AM" : "PM";
						if (hours === 0) {
							hours = 12;
						}
						let minutes = date.getMinutes();
						if (minutes < 10) {
							minutes = "0" + minutes;
						}
						let time = hours + ":" + minutes + " " + am;
						if (Date.now() - this.props.message.timestamp > 24 * 60 * 60 * 1000) {
							let day = (date.getMonth() + 1) + "/" + date.getDate();
							if (new Date(Date.now()).getFullYear() !== date.getFullYear()) {
								day = day + "/" + date.getFullYear();
							}
							time = time + " " + day;
						}
						if (time !== this.state.time) {
							this.setState({ ...this.state, time: time });
						}
					}
				}, 10)
			});
		}
		this.messageRef.current.addEventListener('long-press', (e) => {
			e.preventDefault();
			this.props.setHighlighted(this.props.message);
		});
		this.messageRef.current.addEventListener('click', (e) => {
			if (this.props.getHighlighted() === this.props.message) {
				e.stopPropagation();
			}
		});
	}

	async get_reaction_user_color() {
		let reaction_user_colors = {};
		let message_reactions = this.props.message.reactions;
		for (var user in message_reactions) {
			let user_profile = await this.props.getUser(user);
			reaction_user_colors[user] = user_profile.color;
		}
		return reaction_user_colors;
	}

	componentWillUnmount() {
		clearInterval(this.state.read_thread);
		clearInterval(this.state.time_updater);
	}
}

export default Message;