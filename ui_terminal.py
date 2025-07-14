from argparse import ArgumentParser
import os
import random
import string

import json
from rich.console import Console
from rich.panel import Panel
from rich.text import Text

from personalized_chatbot import PersonalizedChatbot


def load_chat_history(json_path):
    with open(json_path, "r") as f:
        data = json.load(f)
    return data.get("chat_history", [])


def display_last_two_turns(chat_history):
    console = Console()

    # Group into pairs (user followed by assistant)
    paired_turns = []
    i = 0
    while i < len(chat_history) - 1:
        if (
            chat_history[i]["role"] == "user"
            and chat_history[i + 1]["role"] == "assistant"
        ):
            paired_turns.append((chat_history[i], chat_history[i + 1]))
            i += 2
        else:
            i += 1  # skip malformed or incomplete pairs

    last_two_pairs = paired_turns[-2:] if len(paired_turns) >= 2 else paired_turns

    console.print("\n[bold underline cyan]Last Two Chat Turns[/bold underline cyan]\n")

    for idx, (user_msg, assistant_msg) in enumerate(last_two_pairs):
        console.print(
            Panel(
                # Text(user_msg["content"], style="bold white"),
                Text(user_msg["content"], style="bold"),
                title=f"[green]User @ {user_msg['timestamp']}[/green]",
                border_style="green",
            )
        )
        console.print(
            Panel(
                # Text(assistant_msg["content"], style="white"),
                Text(assistant_msg["content"]),
                title=f"[blue]Assistant @ {assistant_msg['timestamp']}[/blue]",
                border_style="blue",
            )
        )


def terminal_ui_plain(exp_name: str, chatbot: PersonalizedChatbot):
    while True:
        user_msg = input("User: ")
        state = chatbot.chat(exp_name, user_msg)
        final_state = chatbot.graph_agent.invoke(state)
        chatbot.save_state(final_state, f"out/{exp_name}/chatbot_state.json")
        print("Assistant:")
        print(final_state["chat_history"][-1]["content"])


def terminal_ui(exp_name: str, chatbot: PersonalizedChatbot):
    from rich.console import Console
    from rich.panel import Panel
    from rich.text import Text

    console = Console()
    out_dir = f"out/{exp_name}"
    os.makedirs(out_dir, exist_ok=True)

    console.print(
        "[bold magenta]\nType your message below. Type 'exit' or Ctrl+C to quit.\n[/bold magenta]"
    )
    while True:
        try:
            user_msg = console.input("[bold cyan]User:[/bold cyan] ")
            if user_msg.strip().lower() in {"exit", "quit"}:
                console.print("[yellow]Goodbye![/yellow]")
                break
            state = chatbot.chat(exp_name, user_msg)
            # Show 'Assistant thinking...' and clear it after invoke
            with console.status(
                "[bold green]Assistant thinking...[/bold green]", spinner="dots"
            ):
                final_state = chatbot.graph_agent.invoke(state)
            chatbot.save_state(final_state, f"{out_dir}/chatbot_state.json")
            assistant_reply = final_state["chat_history"][-1]["content"]
            # Print panels for user and assistant turns
            console.print(
                Panel(
                    # Text(user_msg, style="bold white"),
                    Text(user_msg, style="bold"),
                    title=f"[green]User[/green]",
                    border_style="green",
                )
            )
            console.print(
                Panel(
                    # Text(assistant_reply, style="white"),
                    Text(assistant_reply),
                    title=f"[blue]Assistant[/blue]",
                    border_style="blue",
                )
            )
        except KeyboardInterrupt:
            console.print("\n[yellow]Goodbye![/yellow]")
            break
        except Exception as e:
            console.print(f"[red]Error:[/red] {e}")


if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument(
        "--exp_name",
        "-n",
        type=str,
        default="debug",
        help="The experiment name. Use one single word without spaces. e.g., case_1_hypertension",
    )
    parser.add_argument(
        "--create_new_chat",
        "-c",
        action="store_true",
        help="Create a new chat session. By default, the script will load an exising chat.",
    )
    args = parser.parse_args()
    if args.exp_name is None:
        # ## randonly generate an interesting experiment name
        args.exp_name = "".join(
            random.choices(string.ascii_letters + string.digits, k=10)
        )
        print(
            f"No experiment name provided. Using random name: {args.exp_name}. Please remember this experiment name to resume the chat later."
        )

    os.makedirs(f"out/{args.exp_name}", exist_ok=True)

    if args.create_new_chat:
        if os.path.exists(f"out/{args.exp_name}/chatbot_state.json"):
            print(
                f"Chat session {args.exp_name} already exists. Use --create_new_chat to create a new chat session."
            )
            exit(1)

    if os.path.exists(f"out/{args.exp_name}/chatbot_state.json"):
        history = load_chat_history(f"out/{args.exp_name}/chatbot_state.json")
        display_last_two_turns(history)
    chatbot = PersonalizedChatbot(exp_name=args.exp_name)
    terminal_ui(args.exp_name, chatbot)
