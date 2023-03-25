import React from 'react';
import QRCode from "react-qr-code";
import api from "../Api";
import Crypto from '../Crypto.js';
import { BackArrow } from '../SharedComponents';

class QrCodeConnectScreen extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: true,
        };
    }
    render() {
        let qr = <p>loading qr code</p>;
        if (!this.state.loading) {
            let json = JSON.stringify({url: this.state.url, key: this.state.public_key});
            json  = json.replace(/[\u007F-\uFFFF]/g, function(chr) {
                return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4)
            })
            qr = <div style={{width:"100%"}}><div style={{ display: "inline-block", background: 'white', padding: '16px', width: "fit-content" }}>
                <QRCode value={json} />
            </div></div>
        }
        return <div>
            <h1>Scan This Qr Code from a logged in device</h1>
            <BackArrow onClick={this.props.back}></BackArrow>
            {qr}
        </div>;
    }

    async componentDidMount() {
        let keys = await Crypto.generateKeyPair();
        var max32 = Math.pow(2, 32) - 1;
        var random = Math.floor(Math.random() * max32);
        let url = api.API_URL + "/connect-device/" + random;
        this.setState({ ...this.state, loading: false, public_key: keys.publicKey, private_key: keys.privateKey, url: url });
        let encrypted_message = await api.connect_device(url);
        console.log(encrypted_message);
        let json = JSON.parse(await Crypto.decrypt(keys.privateKey, encrypted_message));

        let token = await api.login(json.username, json.password);
        let account = await api.get_user(json.username);
        let accountKeys = {privateKey: json.private_key, publicKey: account.public_key};
        console.log("finished login: ", token, accountKeys);
        this.props.setUser(token.token, json.username, json.password, accountKeys);
    }
}

export default QrCodeConnectScreen;