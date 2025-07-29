from argparse import ArgumentParser
import os
import random
import string

import json
from rich.console import Console
from rich.panel import Panel
from rich.text import Text

from chatbot import PersonalizedChatbot


def display_chat_history(fp_state, num_turns=2):
    with open(fp_state, "r") as f:
        state = json.load(f)

    chat_history = state["chat_history"]

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

    desired_turns = (
        paired_turns[-num_turns:] if len(paired_turns) >= num_turns else paired_turns
    )

    console.print(
        f"\n[bold underline cyan]Last {num_turns} Chat Turns[/bold underline cyan]\n"
    )

    for idx, (user_msg, assistant_msg) in enumerate(desired_turns):
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
        user_msg = input("User:\n")
        print("Assistant:")
        print(chatbot.chat(user_msg))
        print("-" * 80)


def terminal_ui(chatbot: PersonalizedChatbot):
    from rich.console import Console
    from rich.panel import Panel
    from rich.text import Text

    console = Console()

    console.print(
        "[bold magenta]\nType your message below. Type 'exit' or Ctrl+C to quit.\n[/bold magenta]"
    )
    while True:
        try:
            user_msg = console.input("[bold cyan]User:[/bold cyan] ")
            if user_msg.strip().lower() in {"exit", "quit"}:
                console.print("[yellow]Goodbye![/yellow]")
                break

            # Show 'Assistant thinking...' and clear it after invoke
            with console.status(
                "[bold green]Assistant thinking...[/bold green]", spinner="dots"
            ):
                final_state = chatbot.chat(user_msg)
            assistant_reply = final_state["assistant_msg"]
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


def parse_my_args():
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
    parser.add_argument(
        "--plain",
        "-p",
        action="store_true",
        help="Use plain text terminal UI. By default, the script will use rich terminal UI.",
    )
    parser.add_argument(
        "--debug",
        "-d",
        action="store_true",
        help="Enable debug mode. By default, the script will not enable debug mode.",
    )

    return parser.parse_args()


if __name__ == "__main__":
    args = parse_my_args()

    if args.exp_name is None:
        # ## randonly generate an interesting experiment name
        args.exp_name = "".join(
            random.choices(string.ascii_letters + string.digits, k=10)
        )
        print(
            f"No experiment name provided. Using random name: {args.exp_name}. Please remember this experiment name to resume the chat later."
        )

    chatbot = PersonalizedChatbot(exp_name=args.exp_name, debug=args.debug)
    try:
        display_chat_history(chatbot.fp_chat_history)
    except Exception:
        print(f"No chat history found for {args.exp_name}. Starting a new chat.")

    if args.plain:
        terminal_ui_plain(args.exp_name, chatbot)
    else:
        terminal_ui(chatbot)
