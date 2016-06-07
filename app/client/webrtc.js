var signalingChannelList ={};
var messageCallbackList={};
var channelList = {};


function addMessage(message, peerId){
    var p =document.createElement("p");
    var myMessageDiv = document.getElementById("messages");

    if(peerId==CALLEE_ID){

        p.innerHTML='<i><span style="color:green">'+peerId+'</span></i>: '+message+'<br>';
        myMessageDiv.appendChild(p);
        //<span style="color:blue">
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
          receiveChannel.onmessage = function(event){
            addMessage(event.data,localpeerId);
          };
          receiveChannel.onclose = function(evt) {
            console.log("dataChannel closed:" + localpeerId);
            addMessage("closed",localpeerId);
            removePeerToSelect(localpeerId);
        };

        };

        return pc;
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
        };

        _commChannel.onmessage = function(message){
            //messageCallback(message.data);
            addMessage(message.data,localpeerId);
        };
    }
    
    window.startCommunication = startCommunication;
    startCommunication(peerId);
}


function peerConnectioninit(){
    
}