var signalingChannelList ={};
var messageCallbackList={};
var channelList = {};
var connectedPeersList={};

function addMessage(message, peerId){
    var p =document.createElement("p");
    var myMessageDiv = document.getElementById("messages");

    if(peerId==CALLEE_ID){
        p.innerHTML='<i><span style="color:green">'+peerId+'</span></i>: '+message+'<br>';
        myMessageDiv.appendChild(p);
    }
    else{
        p.innerHTML='<i>'+peerId+'</i>: '+message+'<br>';
        myMessageDiv.appendChild(p);
    }
}

function addPeerToSelect(peerId){
    var ele = document.getElementById("mySelect");
    var option = document.createElement("option");
    option.text = peerId;
    ele.add(option);
    connectedPeersList[connectedPeersList.length]=peerId;
}

function removePeerToSelect(peerId){
    delete channelList[peerId];
    var ele = document.getElementById("mySelect");
    var len = ele.childElementCount;
    for(var i=0;i<len;++i){
        if(peerId == ele.children[i].innerHTML){
            console.log("the following peer is removed: "+peerId);
            ele.remove(i);
        }
    }
}

function init(messageCallback){
    var wsUri = "ws://localhost:8090/";
    signalingChannelList[CALLEE_ID] = createSignalingChannel(wsUri, CALLEE_ID);
    var signalingChannel = signalingChannelList[CALLEE_ID];
}



 window.createPeerConnection = function(signalingChannel, peerId){
        
        var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
        var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
        var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;
        var servers = { iceServers: [{urls: "stun:stun.1.google.com:19302"}] };

        var pc = new RTCPeerConnection(servers, {
            optional: [{
                DtlsSrtpKeyAgreement: true
            }]
        });
        pc.onicecandidate = function (evt) {
            if(evt.candidate){ // empty candidate (wirth evt.candidate === null) are often generated
                signalingChannel.sendICECandidate(evt.candidate, peerId);
            }
        };
        signalingChannel.onICECandidate = function (ICECandidate, source) {
            console.log("receiving ICE candidate from ",source);
            pc.addIceCandidate(new RTCIceCandidate(ICECandidate));
        };
        let localpeerId = peerId;
        addPeerToSelect(localpeerId);

        pc.ondatachannel = function(event) {

            var receiveChannel = event.channel;
            console.log("channel received");
            window.channel = receiveChannel;
            channelList[localpeerId]=receiveChannel;
            addMethodstoChannel(receiveChannel,localpeerId);
        };

        return pc;
    }

function addMethodstoChannel(receiveChannel,localpeerId){

    receiveChannel.onopen = function(event){
        console.log("channel is opened");
    };
    receiveChannel.onmessage = function(event){
        console.log("channel on message");
        //addMessage(event.data,localpeerId);
        peerSignalingChannel(receiveChannel,event,localpeerId);
    };

    receiveChannel.onclose = function(evt) {
        console.log("dataChannel closed:" + localpeerId);
        addMessage("closed",localpeerId);
        removePeerToSelect(localpeerId);
    };

    receiveChannel.onAnswer = function (answer, source) {
        console.log('receiveChannel receive answer from ', source);
    };

    receiveChannel.onICECandidate = function (ICECandidate, source) {
        console.log("receiveChannel receiving ICE candidate from ",source);
    };

    receiveChannel.sendICECandidate = function (ICECandidate, peerId){
        /*
        var message = {};
        message.type = "ICECandidate";
        message["ICECandidate"] = ICECandidate;
        message.destination = peerId;
        receiveChannel.send(JSON.stringify(message));
        */
        sendMessage(receiveChannel,"ICECandidate",ICECandidate,peerId);
    };
    receiveChannel.sendOffer = function (offer, peerId){
        sendMessage(receiveChannel,"offer",offer,peerId);
    };
    function sendMessage(receiveChannel,type, data, destination){
        var message = {};
        message.type = type;
        message[type] = data;
        message.destination = destination;
        receiveChannel.send(JSON.stringify(message));
    }
    
}

function peerSignalingChannel(receiveChannel,evt,localpeerId){
    //var self = this;
    var objMessage = JSON.parse(evt.data);
    let self = receiveChannel;
    
    console.log(evt.data);
    switch (objMessage.type) {
        case "ICECandidate":
            if(objMessage.destination !== undefined && objMessage.destination != CALLEE_ID){
                console.log("forwarding the message to destination: "+objMessage.destination);
                if(channelList[objMessage.destination] !== undefined){
                    channelList[objMessage.destination].send(JSON.stringify({type:"ICECandidate",ICECandidate:objMessage.ICECandidate,source:localpeerId}));
                    return;
                }
            }
            else{
                console.log(CALLEE_ID+" the offer is for me: "+objMessage.destination);
                self.onICECandidate(objMessage.ICECandidate,objMessage.source);
            }
            //receiveChannel.onICECandidate(objMessage.ICECandidate, objMessage.source);
            break;
        case "offer":
            if(objMessage.destination !== undefined && objMessage.destination != CALLEE_ID){
                console.log("forwarding the message to destination: "+objMessage.destination);
                if(channelList[objMessage.destination] !== undefined){
                    channelList[objMessage.destination].send(JSON.stringify({type:"offer",offer:objMessage.offer,source:localpeerId}));
                    return;
                }
            }
            else{
                var source = objMessage.source;
                var offer = objMessage.offer;
                var peerConnection = createPeerConnection(self,source);
                peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                peerConnection.createAnswer(function(answer){
                    peerConnection.setLocalDescription(answer);
                    console.log('sending answer to channel');
                    self.send( JSON.stringify({type:"answer",answer:answer, destination:source}) );
                }, function (e){
                    console.error(e);
                });
                console.log(CALLEE_ID+" the offer is for me: "+objMessage.source);
            }
            break;
        case "answer":
            //self.onAnswer(objMessage.answer, objMessage.source);
            console.log("on answer");
            if(objMessage.destination !== undefined && objMessage.destination != CALLEE_ID){
                console.log("forwarding the message to destination: "+objMessage.destination);
                if(channelList[objMessage.destination] !== undefined){
                    channelList[objMessage.destination].send(JSON.stringify({type:"answer",answer:objMessage.answer,source:localpeerId}));
                    return;
                }
            }
            else{
                self.onAnswer(objMessage.answer,objMessage.source);
                console.log("logging on answer query in the peerSignalingChannel");
            }

            break;
        case "listOfPeers":


            var peers = objMessage.listOfPeers;
            for(let i=0;i<peers.length;++i){
                if(peers[i] != objMessage.destination && channelList[peers[i]] == undefined){
                    console.log('connecting to new peer')
                    startChannelPeerConnection(self, peers[i]);
                }
            }
            //self.onListOfPeers(objMessage.listOfPeers, objMessage.source);
            break;
        case "addPeer":
            //self.onAddPeer(objMessage.addPeer, objMessage.source);
            break;
        case "message":
            console.log("the following message recieved: "+objMessage.message);
            addMessage(objMessage.message,objMessage.peerId);
            break;
        case "removePeer":
            //self.onRemovePeer(objMessage.removePeer, objMessage.source);
            break;
        default:
            throw new Error("invalid message type");
    }

    function _sendChannelMessage(type,data,destination){
        var message = {};
        message.type = type;
        message[type] = data;
        message.destination = destination;
        self.send(JSON.stringify(message));
    }
}


window.startChannelPeerConnection = function(receiveChannel, peerId){
    var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
    var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;
    var servers = {iceServers: [{urls: "stun:stun.1.google.com:19302"}]};
    function startCommunication(peerId) {
        var pc = new RTCPeerConnection(servers, {
            optional: [{
                DtlsSrtpKeyAgreement: true
            }]
        });
        //var signalingChannel = signalingChannelList[CALLEE_ID];
        receiveChannel.onAnswer = function (answer, source) {
            console.log('receive answer from ', source);
            pc.setRemoteDescription(new RTCSessionDescription(answer));
        };

        receiveChannel.onICECandidate = function (ICECandidate, source) {
            console.log("receiving ICE candidate from ",source);
            pc.addIceCandidate(new RTCIceCandidate(ICECandidate));
        };

        pc.onicecandidate = function (evt) {
            if(evt.candidate){ // empty candidate (wirth evt.candidate === null) are often generated
                receiveChannel.sendICECandidate(evt.candidate, peerId);
            }
        };

        //:warning the dataChannel must be opened BEFORE creating the offer.
        var _commChannel = pc.createDataChannel('communication', {
            reliable: false
        });

        pc.createOffer(function(offer){
            pc.setLocalDescription(offer);
            console.log('send offer');
            receiveChannel.sendOffer(offer, peerId);
        }, function (e){
            console.error(e);
        });

        let localpeerId = peerId;
        

        channelList[localpeerId] = _commChannel;
        window.channel = _commChannel;
        addPeerToSelect(localpeerId);


        addMethodstoChannel(_commChannel,localpeerId);

        _commChannel.onclose = function(evt) {
            console.log("dataChannel closed:" + localpeerId);
            addMessage("closed",localpeerId);
            removePeerToSelect(localpeerId);
        };

        _commChannel.onerror = function(evt) {
            console.error("dataChannel error");
        };

        _commChannel.onopen = function(){
            console.log("dataChannel opened");
            var plist =[];
            for(key in channelList){
                if(channelList[key].readyState=="open"){
                    plist[plist.length] = key;
                }
            }
            var message = {};
            message.type = "listOfPeers";
            message["listOfPeers"] = plist;//Object.keys(channelList);
            message.destination = localpeerId;
            _commChannel.send(JSON.stringify(message));
            console.log("sending list of connected peers to : "+localpeerId);
            console.log("message is: "+JSON.stringify(message));

        };

        /*
        _commChannel.onmessage = function(message){
            //messageCallback(message.data);
            addMessage(message.data,localpeerId);
        };
        */
    }
    
    window.startCommunication = startCommunication;
    startCommunication(peerId);
}



window.startPeerConnection = function(peerId){
    var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
    var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;
    var servers = {iceServers: [{urls: "stun:stun.1.google.com:19302"}]};
    function startCommunication(peerId) {
        var pc = new RTCPeerConnection(servers, {
            optional: [{
                DtlsSrtpKeyAgreement: true
            }]
        });
        var signalingChannel = signalingChannelList[CALLEE_ID];
        signalingChannel.onAnswer = function (answer, source) {
            console.log('receive answer from ', source);
            pc.setRemoteDescription(new RTCSessionDescription(answer));
        };

        signalingChannel.onICECandidate = function (ICECandidate, source) {
            console.log("receiving ICE candidate from ",source);
            pc.addIceCandidate(new RTCIceCandidate(ICECandidate));
        };

        pc.onicecandidate = function (evt) {
            if(evt.candidate){ // empty candidate (wirth evt.candidate === null) are often generated
                signalingChannel.sendICECandidate(evt.candidate, peerId);
            }
        };

        //:warning the dataChannel must be opened BEFORE creating the offer.
        var _commChannel = pc.createDataChannel('communication', {
            reliable: false
        });

        pc.createOffer(function(offer){
            pc.setLocalDescription(offer);
            console.log('send offer');
            signalingChannel.sendOffer(offer, peerId);
        }, function (e){
            console.error(e);
        });

        let localpeerId = peerId;
        

        channelList[localpeerId] = _commChannel;
        window.channel = _commChannel;
        addPeerToSelect(localpeerId);



        addMethodstoChannel(_commChannel,localpeerId);

        _commChannel.onclose = function(evt) {
            console.log("dataChannel closed:" + localpeerId);
            addMessage("closed",localpeerId);
            removePeerToSelect(localpeerId);
        };

        _commChannel.onerror = function(evt) {
            console.error("dataChannel error");
        };

        _commChannel.onopen = function(){
            console.log("dataChannel opened");

            var message = {};
            message.type = "listOfPeers";
            message["listOfPeers"] = Object.keys(channelList);
            message.destination = localpeerId;
            _commChannel.send(JSON.stringify(message));
            console.log("sending list of connected peers to : "+localpeerId);
            console.log("message is: "+JSON.stringify(message));

        };

        /*
        _commChannel.onmessage = function(message){
            //messageCallback(message.data);
            addMessage(message.data,localpeerId);
        };
        */
    }
    
    window.startCommunication = startCommunication;
    startCommunication(peerId);
}


function peerConnectioninit(){
    
}