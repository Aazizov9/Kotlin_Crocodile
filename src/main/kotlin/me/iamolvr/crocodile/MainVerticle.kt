package me.iamolvr.crocodile

import io.vertx.core.AbstractVerticle
import io.vertx.core.json.JsonObject
import io.vertx.ext.bridge.BridgeEventType
import io.vertx.ext.bridge.PermittedOptions
import io.vertx.ext.web.Router
import io.vertx.ext.web.RoutingContext
import io.vertx.ext.web.handler.StaticHandler
import io.vertx.ext.web.handler.sockjs.SockJSBridgeOptions
import io.vertx.ext.web.handler.sockjs.SockJSHandler

class MainVerticle : AbstractVerticle()  {

  override fun start() {
    val router = Router.router(vertx)

    val opts = SockJSBridgeOptions()
      .addInboundPermitted(PermittedOptions().setAddressRegex("to.server"))
      .addInboundPermitted(PermittedOptions().setAddressRegex("ping"))
      .addOutboundPermitted(PermittedOptions().setAddressRegex("client\\.[0-9]+"))

    val ebHandler = SockJSHandler.create(vertx)
    val eb = vertx.eventBus()

    //=========================================

    val client_list: MutableList<String> = ArrayList()

    var counter = 0
    var game_state = false
    var closed_word = ""
    var word_choice = ""
    var client_choice = ""
    var message_decoded: JsonObject

    val words_array = arrayOf("волк", "корова", "лягушка", "таракан", "динозавр",
      "кошка", "собака", "обезьяна", "стрекоза", "муха", "медоед", "сороконожка",
      "мышь", "жираф", "носорог", "лев", "тигр", "единорог", "медуза", "пантера")

    //=========================================

    fun game() {
      word_choice = words_array.random()

      for (item in client_list) {
        if (item.contains(client_choice)) {
          eb.send(client_choice, JsonObject().put("type", "word").put("role", "host").put("content", word_choice))
        }
        else {
          closed_word = ""
          for (letter in word_choice) {
            closed_word += "<i class=\"fas fa-question-circle\"></i>"
          }
          eb.send(item, JsonObject().put("type", "word").put("role", "spectator").put("content", closed_word))
        }
      }
    }

    //=========================================

    ebHandler.bridge(opts) { event ->
      if (event.type() == BridgeEventType.REGISTERED) {
        counter++
        client_list.add(event.rawMessage.getString("address"))
        println("New registration list $client_list")

        if (counter > 1 && !game_state) {
          game_state = true
          client_choice = client_list.random()
          for (item in client_list) {
            eb.send(item, JsonObject().put("type", "chat").put("sender", "Server").put("content", "The game has started").put("state", "start"))
          }
          game()
        }
        else if (counter > 1 && game_state) {
          eb.send(event.rawMessage.getString("address"), JsonObject().put("type", "chat").put("sender", "Server").put("content", "$client_choice is drawing..."))
          eb.send(event.rawMessage.getString("address"), JsonObject().put("type", "word").put("role", "spectator").put("content", closed_word))
        }
      }
      else if (event.type() == BridgeEventType.SOCKET_CLOSED) {
        counter--
        if (counter <= 1) {
          game_state = false
          for (item in client_list) {
            eb.send(item, JsonObject().put("type", "chat").put("sender", "Server").put("content", "Not enough players"))
            eb.send(item, JsonObject().put("type", "word").put("role", "host").put("content", "").put("state", "end"))
          }
        }

        for (item in client_list) {
          eb.send(item, JsonObject().put("type", "ping"))
        }
        client_list.clear()

        eb.consumer<Any>("ping") { message ->
          client_list.add(message.body().toString())
        }

//      if (client_choice !in client_list && client_list.isNotEmpty()) {
//        println("Host left the game")
//        client_choice = ""
//        game()
//      }

      }
      event.complete(true)
    }

    //=========================================

    router.mountSubRouter("/eventbus/", ebHandler.bridge(opts))

    router.route().handler(StaticHandler.create().setCachingEnabled(false))

    router.routeWithRegex("\\/.+").handler { context: RoutingContext ->
      context.reroute("/")
    }

    vertx.createHttpServer().requestHandler(router).listen(80)

    //=========================================

    eb.consumer<Any>("to.server") { message ->
      message_decoded = JsonObject(message.body().toString())
      if (message_decoded.getString("type") == "chat") {
        if (game_state) {
          for (item in client_list) {
            eb.send(item, "${message.body()}")
          }
          if (message_decoded.getString("content").toLowerCase() == word_choice && message_decoded.getString("sender") != client_choice) {
            for (item in client_list) {
              eb.send(item, JsonObject().put("type", "chat").put("sender", "Server").put("content", "${message_decoded.getString("sender")} guessed the word"))
            }
            client_choice = message_decoded.getString("sender")
            game()
          }
        }
        else {
          for (item in client_list) {
            eb.send(item, "${message.body()}")
          }
        }
      }
      else {
        for (item in client_list) {
          eb.send(item, "${message.body()}")
        }
      }
    }
  }
}
