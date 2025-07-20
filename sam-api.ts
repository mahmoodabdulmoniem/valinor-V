import type { Bid } from "@/types";

export function mapOpportunityToBid(opportunity: any): Bid {
  return {
    id: opportunity.noticeId,
    title: opportunity.title,
    agency: opportunity.department || opportunity.agency,
    postedDate: opportunity.postedDate,
    deadline: opportunity.responseDeadLine,
    solicitationNumber: opportunity.solicitationNumber,
    setAside: opportunity.setAside,
    naicsCode: opportunity.naicsCode,
    type: opportunity.type,
    description: opportunity.description,
    pointOfContact: opportunity.pointOfContact?.map((contact: any) => ({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
    })) || [],
    placeOfPerformance: opportunity.placeOfPerformance,
    attachments: opportunity.attachments?.map((att: any) => ({
      name: att.name,
      url: att.url,
      type: att.type,
    })) || [],
    status: determineStatus(opportunity),
    // Add any other fields your Bid model requires
  };
}

function determineStatus(opportunity: any): string {
  const now = new Date();
  const deadline = new Date(opportunity.responseDeadLine);
  return now < deadline ? "open" : "closed";
}
