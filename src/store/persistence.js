module.exports = (store) => {

  // initialize data
  if (localStorage.getItem("background")) {
    store.commit("setBackground", localStorage.background);
  }
  if (localStorage.getItem("static")) {
    store.commit("toggleStatic", true);
  }
  if (localStorage.getItem("imageOptIn")) {
    store.commit("toggleImageOptIn", true);
  }
  if (localStorage.getItem("zoom")) {
    store.commit("setZoom", parseFloat(localStorage.getItem("zoom")));
  }
  if (localStorage.roles !== undefined) {
    store.commit("setCustomRoles", JSON.parse(localStorage.roles));
    store.commit("setEdition", { id: "custom" });
  }
  if (localStorage.edition !== undefined) {
    // this will initialize state.roles for official editions
    store.commit("setEdition", JSON.parse(localStorage.edition));
  }
  if (localStorage.bluffs !== undefined) {
    JSON.parse(localStorage.bluffs).forEach((role, index) => {
      store.commit("players/setBluff", {
        index,
        role: store.state.roles.get(role) || {},
      });
    });
  }
  if (localStorage.fabled !== undefined) {
    store.commit("players/setFabled", {
      fabled: JSON.parse(localStorage.fabled).map(
        (fabled) => store.state.fabled.get(fabled.id) || fabled,
      ),
    });
  }
  if (localStorage.players) {
    store.commit(
      "players/set",
      JSON.parse(localStorage.players).map((player) => ({
        ...player,
        role:
          store.state.roles.get(player.role) ||
          store.getters.rolesJSONbyId.get(player.role) ||
          {},
      })),
    );
  }

  store.commit("loginbackend/setMdict", localStorage.isMdict);

  if (localStorage.selfNotes) {
    store.commit("loginbackend/setNotes", localStorage.selfNotes);
  }
  
  /** Quick Login with existing data. */
  // if (localStorage.serverURL) {
  //   console.log("server URL: ", localStorage.serverURL);
  //   store.commit("loginbackend/setServerURL", localStorage.serverURL);
  // }
  // if (localStorage.username) {
  //   console.log("Logining...",localStorage.username, localStorage.password);
  //   store.commit("loginbackend/loginWithData", {
  //     username: localStorage.username,
  //     pwd: localStorage.password
  //   });
  // }else{
  //   console.log("No data.");
  // }

  // listen to mutations
  store.subscribe(({ type, payload }, state) => {
    switch (type) {
      case "setBackground":
        if (payload) {
          localStorage.setItem("background", payload);
        } else {
          localStorage.removeItem("background");
        }
        break;
      case "toggleMuted":
        if (state.grimoire.isMuted) {
          localStorage.setItem("muted", 1);
        } else {
          localStorage.removeItem("muted");
        }
        break;
      case "toggleStatic":
        if (state.grimoire.isStatic) {
          localStorage.setItem("static", 1);
        } else {
          localStorage.removeItem("static");
        }
        break;
      case "toggleImageOptIn":
        if (state.grimoire.isImageOptIn) {
          localStorage.setItem("imageOptIn", 1);
        } else {
          localStorage.removeItem("imageOptIn");
        }
        break;
      case "setZoom":
        if (payload !== 0) {
          localStorage.setItem("zoom", payload);
        } else {
          localStorage.removeItem("zoom");
        }
        break;
      case "setEdition":
        localStorage.setItem("edition", JSON.stringify(payload));
        if (state.edition.isOfficial) {
          localStorage.removeItem("roles");
        }
        break;
      case "setCustomRoles":
        if (!payload.length) {
          localStorage.removeItem("roles");
        } else {
          localStorage.setItem("roles", JSON.stringify(payload));
        }
        break;
      case "players/setBluff":
        localStorage.setItem(
          "bluffs",
          JSON.stringify(state.players.bluffs.map(({ id }) => id)),
        );
        break;
      case "players/setFabled":
        localStorage.setItem(
          "fabled",
          JSON.stringify(
            state.players.fabled.map((fabled) =>
              fabled.isCustom ? fabled : { id: fabled.id },
            ),
          ),
        );
        break;
      case "players/add":
      case "players/update":
      case "players/remove":
      case "players/clear":
      case "players/set":
      case "players/swap":
      case "players/move":
        if (state.players.players.length) {
          localStorage.setItem(
            "players",
            JSON.stringify(
              state.players.players.map((player) => ({
                ...player,
                // simplify the stored data
                role: player.role.id || {},
              })),
            ),
          );
        } else {
          localStorage.removeItem("players");
        }
        break;
      case "loginbackend/setSessionId":
        if (payload) {
          localStorage.setItem(
            "session",
            JSON.stringify([state.session.isSpectator, payload]),
          );
        } else {
          localStorage.removeItem("session");
        }
        break;
      case "loginbackend/setPlayerId":
        if (payload && payload != '') {
          localStorage.setItem("playerId", payload);
        } else {
          localStorage.removeItem("playerId");

          //try reconnect.
          if (localStorage.username) {
            console.log("Logining...",localStorage.username, localStorage.password);
            store.commit("loginbackend/loginWithData", {
              username: localStorage.username,
              pwd: localStorage.password
            });
          }
        }
        break;
      case "loginbackend/setMdict":
        if (payload) {
          localStorage.setItem("isMdict", payload);
        } else {
          localStorage.removeItem("isMdict");
        }
        break;
      case "loginbackend/setNotes":
        if (payload) {
          localStorage.setItem("selfNotes", payload);
        } else {
          localStorage.removeItem("selfNotes");
        }
        break;
      case "loginbackend/setServerURL":
        if (payload) {
          localStorage.setItem("serverURL", payload);
        }
        break;
      case "loginbackend/loginWithData":
        if (payload) {
          console.log("inf updated.",payload.username, payload.pwd);
          localStorage.setItem("username", payload.username);
          localStorage.setItem("password", payload.pwd);
        }
        break;
      case "loginbackend/loginWithStorage":
        if (localStorage.username) {
          console.log("Logining...",localStorage.username, localStorage.password);
          store.commit("loginbackend/loginWithData", {
            username: localStorage.username,
            pwd: localStorage.password
          });
        }
        break;
      case "loginbackend/logout":
        localStorage.removeItem("username");
        localStorage.removeItem("password");
        break;
    }
  });
};
