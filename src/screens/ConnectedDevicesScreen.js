import { useState } from "react";
import { useZxing } from "react-zxing";
import React from 'react';
import api from "../Api"
import Crypto from "../Crypto"

class ConnectedDevicesScreen extends React.Component {
    render() {
        return <BarcodeScanner getPrivateKey={this.props.getPrivateKey} getPassword={this.props.getPassword} getUsername={this.props.getUsername}></BarcodeScanner>;
    }
}

export const BarcodeScanner = (props) => {
    const [result, setResult] = useState("");
    const { ref } = useZxing({
        async onResult(result) {
            setResult(result.getText());
            console.log(result.getText());
            let json = JSON.parse(result.getText());
            console.log("parsed");
            let url = json.url;
            let public_key = json.key;
            let data = { private_key: props.getPrivateKey(), password: props.getPassword(), username: props.getUsername() };
            console.log(json.key, data);
            json = JSON.stringify(data);
            console.log(json);
            let encryptedText = await Crypto.encrypt(public_key, json);
            console.log("encryted", encryptedText);
            api.post_device_connection(url, encryptedText);
            console.log("posted");
        },
    });

    return (
        <>
            <video ref={ref} />
            <p>
                <span>Last result:</span>
                <span>{result}</span>
            </p>
        </>
    );
};

export default ConnectedDevicesScreen;
