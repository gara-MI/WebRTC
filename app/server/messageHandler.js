var  connectedPeers = {};
function onMessage(ws, message){
    var type = message.type;
    switch (type) {
        case "ICECandidate":
            onICECandidate(message.ICECandidate, message.destination, ws.id);
            break;
        case "offer":
            onOffer(message.offer, message.destination, ws.id);
            break;
        case "answer":
            onAnswer(message.answer, message.destination, ws.id);
            break;
        case "init":
            onInit(ws, message.init);
            break;
        case "listOfPeers":
            updateListOfPeers(ws);
            break;
        case "removePeer":
            removePeer(ws);
            break;
        default:
            throw new Error("invalid message type");
    }
}
function removePeer(ws){
    delete connectedPeers[ws.id];
    for(var dest in connectedPeers){
        if(dest !== undefined){
            console.log("sending  peerid:"+ws.id +"to remove from:", dest);
            connectedPeers[dest].send(JSON.stringify({
                type:'removePeer',
                removePeer:ws.id,
                source:dest,
            }));
        }
    }
}
function updateListOfPeers(ws){
    console.log('updating list of connected peers');
    delete connectedPeers[ws.id];
    for(var dest in connectedPeers){
        if(dest !== undefined){
            console.log("sending list of peers to peer id:", dest);
            connectedPeers[dest].send(JSON.stringify({
                type:'listOfPeers',
                listOfPeers:Object.keys(connectedPeers),
                source:dest,
            }));
        }
    }

}
function onInit(ws, id){
    console.log("init from peer:", id);
    ws.id = id;
    

    for(var dest in connectedPeers){

        if(dest !== undefined){
            console.log("sending list of peers to peer", dest);
            connectedPeers[dest].send(JSON.stringify({
                type:'addPeer',
                addPeer:id,
                source:dest,
            }));
        }
    }
    connectedPeers[id] = ws; 
}


function onOffer(offer, destination, source){
    
    console.log("offer from peer:", source, "to peer", destination);
    /*
    for(var dest in connectedPeers){

        if(dest===source){
            console.log("source ws");
        }
        else if(dest !== undefined){
            console.log("sending offer from peer:", source, "to peer", destination);
            connectedPeers[dest].send(JSON.stringify({
                type:'offer',
                offer:offer,
                source:source,
            }));
        }
    }
    */
     connectedPeers[destination].send(JSON.stringify({
        type:'offer',
        offer:offer,
        source:source,
    }));
    
}

function onAnswer(answer, destination, source){
    console.log("answer from peer:", source, "to peer", destination);
    /*
    for(var dest in connectedPeers){
        if(dest===source){
            console.log("source ws: "+source);
        }
        else if(dest !== undefined){
            connectedPeers[dest].send(JSON.stringify({
                type: 'answer',
                answer: answer,
                source: source,
            }));
        }
    }
    */
    connectedPeers[destination].send(JSON.stringify({
        type: 'answer',
        answer: answer,
        source: source,
    }));
    
}

function onICECandidate(ICECandidate, destination, source){
    console.log("ICECandidate from peer:", source, "to peer", destination);

    /*
    for(var dest in connectedPeers){
        if(dest===source){
            console.log("source ws: "+source);
        }
        else if(dest !== undefined){
            connectedPeers[dest].send(JSON.stringify({
                type: 'ICECandidate',
                ICECandidate: ICECandidate,
                source: source,
            }));
        }
    }
    */

    connectedPeers[destination].send(JSON.stringify({
        type: 'ICECandidate',
        ICECandidate: ICECandidate,
        source: source,
    }));
}

module.exports = onMessage;

//exporting for unit tests only
module.exports._connectedPeers = connectedPeers;