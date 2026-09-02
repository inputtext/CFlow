import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/react";
import "../styles/auth.css";
import CallStack from "./CallStack";

function ClerkGate({ children }) {
  return (
    <>
      <header
        className="
          fixed
          right-5
          top-4
          z-[1000]
          flex
          items-center
          gap-2
          font-mono
          pr-[112px]
        "
      >
        <Show when="signed-out">
          <SignInButton>
            <button
              type="button"
              className="
                border-2
                border-[#171717]
                bg-[#FFF9F0]
                px-4
                py-2
                text-[10px]
                font-black
                uppercase
                tracking-[0.12em]
                text-[#171717]
                shadow-[3px_3px_0_#171717]
                transition-transform
                duration-200
                hover:-translate-y-0.5
                active:translate-y-0
              "
            >
              SIGN IN
            </button>
          </SignInButton>

          <SignUpButton>
            <button
              type="button"
              className="
                border-2
                border-[#171717]
                bg-[#171717]
                px-4
                py-2
                text-[10px]
                font-black
                uppercase
                tracking-[0.12em]
                text-[#FFF9F0]
                shadow-[3px_3px_0_#FFE3A3]
                transition-transform
                duration-200
                hover:-translate-y-0.5
                active:translate-y-0
              "
            >
              SIGN UP
            </button>
          </SignUpButton>
        </Show>

        <Show when="signed-in">
          <UserButton />
        </Show>
      </header>

      <Show when="signed-in">
        {children}
        <CallStack />
      </Show>

      <Show when="signed-out">
        <main
          className="
            flex
            min-h-dvh
            items-center
            justify-center
            bg-[#FFF9F0]
            px-6
            py-16
            text-[#171717]
          "
        >
          <section
            className="
              cflow-auth-card-enter
              w-full
              max-w-[620px]
              border-2
              border-[#171717]
              bg-[#E8DFFF]
              p-8
              shadow-[8px_8px_0_#171717]
              sm:p-12
            "
          >
            <p
              className="
                font-mono
                text-[10px]
                font-black
                uppercase
                tracking-[0.28em]
                opacity-60
              "
            >
              C·FLOW / AUTHENTICATION
            </p>

            <h1
              className="
                mt-4
                text-[42px]
                font-black
                tracking-[-0.05em]
                sm:text-[56px]
              "
            >
              Your DSA companion.
            </h1>

            <p
              className="
                mt-4
                max-w-[520px]
                font-mono
                text-sm
                leading-6
                opacity-70
              "
            >
              DSA made even easier. Sign in or create an account to enter
              the interactive C·FLOW visualizer.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <SignUpButton>
                <button
                  type="button"
                  className="
                    border-2
                    border-[#171717]
                    bg-[#171717]
                    px-5
                    py-3
                    font-mono
                    text-[11px]
                    font-black
                    uppercase
                    tracking-[0.12em]
                    text-[#FFF9F0]
                    shadow-[4px_4px_0_#FFE3A3]
                    transition-[transform,box-shadow]
                    duration-200
                    ease-out
                    hover:-translate-y-1
                    hover:shadow-[5px_6px_0_#FFE3A3]
                    active:translate-y-0
                    active:shadow-[2px_2px_0_#FFE3A3]
                  "
                >
                  GET STARTED →
                </button>
              </SignUpButton>

              <SignInButton>
                <button
                  type="button"
                  className="
                    border-2
                    border-[#171717]
                    bg-[#FFF9F0]
                    px-5
                    py-3
                    font-mono
                    text-[11px]
                    font-black
                    uppercase
                    tracking-[0.12em]
                    text-[#171717]
                    shadow-[4px_4px_0_#171717]
                    transition-[transform,box-shadow]
                    duration-200
                    ease-out
                    hover:-translate-y-1
                    hover:shadow-[5px_6px_0_#171717]
                    active:translate-y-0
                    active:shadow-[2px_2px_0_#171717]
                  "
                >
                  SIGN IN
                </button>
              </SignInButton>
            </div>
          </section>
        </main>
      </Show>
    </>
  );
}

export default ClerkGate;
