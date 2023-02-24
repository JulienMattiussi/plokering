import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { Peer } from "peerjs";

import { ADMIN_CODE, ID_PREFIX } from "./constants";
import CONFIG from "./config";
import { getRandomNickname } from "./getIdentity";
import { isConnectionOpened } from "./isConnectionOpened";
import { AddPeerZone } from "./AddPeerZone";
import { ChooseCardZone } from "./ChooseCardZone";
import { ConnectionZone } from "./ConnectionZone";
import { LogoZone } from "./LogoZone";
import { MainZone } from "./MainZone";
import { SendMessageZone } from "./SendMessageZone";

export const MainPage = ({
  friendsList,
  setFriendsList,
  peer,
  setPeer,
  myPeerId,
  setMyPeerId,
}) => {
  const [myName, setMyName] = useState(getRandomNickname());
  const [chosenCards, setChosenCards] = useState({});
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (friendsList && Object.keys(friendsList).length) {
      transmitNewConnections(friendsList);
    }
  }, [Object.keys(friendsList).length]);

  const addFriend = (connection) => {
    setFriendsList((previous) => {
      const updatedFriendsList = {
        ...previous,
        [connection.peer]: { name: `[${connection.peer}]`, connection },
      };
      return updatedFriendsList;
    });
  };

  const addMessage = (message) => {
    setMessages((previousMessages) => [...previousMessages, message]);
  };

  const chooseCard = (cardValue) => {
    setChosenCards((previous) => ({
      ...previous,
      [`${ID_PREFIX}_${myPeerId}`]: { card: cardValue, name: myName },
    }));
  };

  const resetCards = () => {
    setChosenCards({});
  };

  const handlePeerId = (event) => {
    setMyPeerId(event.target.value);
  };

  const handlePeerName = (event) => {
    setMyName(event.target.value);
  };

  const updateFriendName = (name, friendId) => {
    setFriendsList((previous) => ({
      ...previous,
      [friendId]: { ...previous[friendId], name },
    }));
  };

  const connectionMessage = (conn) => {
    console.log(`Connection with [${conn.peer}]`);
    addMessage({ author: ADMIN_CODE, text: `Connection with [${conn.peer}]` });
    conn.send({ name: myName, message: `Hello, I'm new here` });
  };

  const receiveData = (connection, { name, message, card, newFriends }) => {
    updateFriendName(name, connection.peer);
    if (message) {
      addMessage({ author: name, text: message });
    }
    if (card !== null && card !== undefined) {
      setChosenCards((previous) => ({
        ...previous,
        [connection.peer]: { card, name },
      }));
    }
    if (newFriends && newFriends.length) {
      newFriends.map((newFriend) => {
        if (!friendsList[newFriend]) {
          connectToPeer(newFriend)();
        }
      });
    }
  };

  const register = () => {
    const peer = new Peer(`${ID_PREFIX}_${myPeerId}`, CONFIG.peerJsServer);
    setPeer(peer);
    peer.on("open", (id) => {
      console.log("Registered");
      addMessage({
        author: ADMIN_CODE,
        text: `Registered, my peer ID is: [${id}]`,
      });
    });

    peer.on("connection", (conn) => {
      console.log("Connection received");

      conn.on("data", (data) => {
        receiveData(conn, data);
      });

      conn.on("open", () => {
        addFriend(conn);
        connectionMessage(conn);
      });
    });

    peer.on("error", (error) => {
      if (!peer?.open) {
        setPeer(null);
        setFriendsList({});
      }
      console.error(error);
      addMessage({ author: ADMIN_CODE, text: `Error : ${error.message}` });
    });
  };

  const connectToPeer = (friendId) => () => {
    if (peer) {
      let conn = peer.connect(friendId);

      conn.on("data", (data) => {
        receiveData(conn, data);
      });

      conn.on("open", () => {
        addFriend(conn);
        connectionMessage(conn);
      });
    }
  };

  const unRegister = () => {
    if (peer) {
      peer.disconnect();
      peer.destroy();
      setPeer(null);
      setFriendsList({});
      console.log("Unregistered");
      addMessage({
        author: ADMIN_CODE,
        text: `Unregistered, all connections closed`,
      });
    }
  };

  const transmitNewConnections = (friendsList) => {
    Object.keys(friendsList).map((friendId) => {
      const newFriendsList = Object.keys(friendsList).filter(
        (key) => key !== friendId
      );

      if (newFriendsList.length) {
        friendsList[friendId].connection.send({
          name: myName,
          newFriends: newFriendsList,
        });
      }
    });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "row" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignContent: "center",
          width: "20%",
        }}
      >
        <LogoZone />
        <Box>
          <ConnectionZone
            peerId={myPeerId}
            peerName={myName}
            handlePeerId={handlePeerId}
            handlePeerName={handlePeerName}
            peer={peer}
            register={register}
            unRegister={unRegister}
          />

          <AddPeerZone
            friendsList={friendsList}
            peer={peer}
            connectToPeer={connectToPeer}
          />
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", width: "58%" }}>
        <MainZone
          connectionOk={isConnectionOpened(friendsList)}
          friendsList={friendsList}
          messages={messages}
          chosenCards={chosenCards}
          peerId={`${ID_PREFIX}_${myPeerId}`}
          resetCards={resetCards}
        />
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignContent: "center",
          width: "20%",
        }}
      >
        <SendMessageZone
          myName={myName}
          friendsList={friendsList}
          addMessage={addMessage}
        />

        <ChooseCardZone
          myName={myName}
          friendsList={friendsList}
          chooseCard={chooseCard}
        />
      </Box>
    </Box>
  );
};
