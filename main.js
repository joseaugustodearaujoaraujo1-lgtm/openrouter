import { ChatGroq } from "@langchain/groq"
import { ChatOpenRouter } from "@langchain/openrouter"
import dotenv from "dotenv"
import express from "express"
import { context, createAgent, modelFallbackMiddleware } from "langchain"

dotenv.config()

const porta = 3001
const app = express()

app.use(express.json())

const roteadorOpenrouter = new ChatOpenRouter({
    model: process.env.OPENROUTER_MODELO_1,
    apiKey: process.env.API_ROUTER,
    temperature: 0.7,
    models: [
        process.env.OPENROUTER_MODELO_2,
        process.env.OPENROUTER_MODELO_3,
        process.env.OPENROUTER_MODELO_4
    ],
    route: "fallback"
})

const modeloGroq = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0.7,
    apiKey: process.env.API_GROQ
})

const agent = createAgent({
    model: roteadorOpenrouter,
    middleware: [
        modelFallbackMiddleware(modeloGroq)
    ]
})

const historico = []

app.post("/conversa", async (req, res) => {
    try {
        const { pergunta } = req.body

        historico.push({role: "user" , content: pergunta})

        const resposta = await agent.invoke({
            messages: [{ role: "user" , content: pergunta}]
        })

        historico.push({role: "assistant" , content: resposta.messages.at(-1).content})

        return res.status(200).json({ "Resposta": resposta.messages.at(-1).content })
    } catch (error) {
        console.log(error)
    }
})

app.get("/conversa/historico" , async (req ,res) => {
    try {
        if(historico.length === 0){
            return res.status(404).json({"Resposta": "Nenhum usuario encontrado!"})
        }

        return res.status(200).json({"Resposta": historico})
    } catch (error) {
        console.log(error.message)
    }
})

app.use((req, res, next) => { res.status(404).json({ "Resposta": "Rota não encontrada, tente novamente mais tarde!" }) })

app.listen(porta, () => {
    console.log("http://localhost:" + porta)
})


