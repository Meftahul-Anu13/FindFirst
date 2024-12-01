package dev.findfirst.core.model;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;

public record SearchBkmkByTagReq(@NotEmpty List<String>tags){

@Override public boolean equals(Object obj){if(obj instanceof SearchBkmkByTagReq tagSearch){return this.tags().equals(tagSearch.tags());}return false;}

}
