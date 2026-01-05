import { FaXTwitter, FaTelegram, FaDiscord, FaGithub, FaTwitter } from 'react-icons/fa6';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="w-full bg-[#02101C] border-t border-[#1C3850] pt-12 md:pt-28 pb-6 mt-auto">
            <div className="container mx-auto px-4 max-w-[1424px]">
                <div className="flex flex-col md:flex-row md:justify-end gap-8 md:gap-24">
                    {/* Social Media Column */}
                    <div className="flex flex-col gap-3 md:gap-4">
                        <h3 className="font-everett text-xl text-white">Connect With Us</h3>
                        <div className="flex gap-6">
                            <a href="https://x.com/suicommunity" 
                               target="_blank" 
                               rel="noopener noreferrer" 
                               className="text-[#ABBDCC] hover:text-[#4DA2FF] transition-colors">
                                <FaXTwitter size={24} />
                            </a>
                            {/* <a href="https://t.me/suinetwork" 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="text-[#ABBDCC] hover:text-[#4DA2FF] transition-colors">
                                <FaTelegram size={24} />
                            </a>
                            <a href="https://discord.gg/sui" 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="text-[#ABBDCC] hover:text-[#4DA2FF] transition-colors">
                                <FaDiscord size={24} />
                            </a>
                            <a href="https://github.com/MystenLabs" 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="text-[#ABBDCC] hover:text-[#4DA2FF] transition-colors">
                                <FaGithub size={24} />
                            </a> */}
                        </div>
                    </div>

                    {/* Documentation Column */}
                    <div className="flex flex-col gap-3 md:gap-4">
                        <h3 className="font-everett text-xl text-white">Resources</h3>
                        <div className="flex flex-col gap-3">
                            <Link href="/terms" 
                                  className="text-[#ABBDCC] hover:text-[#4DA2FF] transition-colors font-everett_light"
                                  target="_blank"
                                  rel="noopener noreferrer">
                                Terms of Service
                            </Link>
                            <Link href="/faq"   
                                  className="text-[#ABBDCC] hover:text-[#4DA2FF] transition-colors font-everett_light"
                                  target="_blank"
                                  rel="noopener noreferrer">
                                FAQ
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
